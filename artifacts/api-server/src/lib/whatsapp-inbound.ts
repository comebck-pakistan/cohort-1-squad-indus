import { and, desc, eq } from "drizzle-orm";
import {
  bakersTable,
  channelEventsTable,
  db,
  notificationsTable,
  ordersTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { processChatMessage } from "./chat-agent.js";
import { isWhatsAppCapReached } from "./plan-limits.js";
import {
  findPendingFeedbackOrder,
  parseFeedbackReply,
  recordOrderFeedback,
} from "./order-feedback.js";
import { toReceiptDataUrl } from "./receipt-image.js";
import { normalizePakistanPhone } from "./phone.js";
import { logOrderActivity } from "./audit.js";
import {
  ocrWhatsAppImageHint,
  phonesMatch,
  type WhatsAppInboundMessage,
} from "./whatsapp.js";

export type WhatsAppOutboundSender = (
  to: string,
  body: string,
) => Promise<boolean>;

export async function claimChannelMessage(input: {
  provider: string;
  bakerId: number;
  messageId: string;
  payloadHash: string;
}): Promise<number | null> {
  const [inserted] = await db
    .insert(channelEventsTable)
    .values({
      provider: input.provider,
      externalId: input.messageId,
      bakerId: input.bakerId,
      channel: "whatsapp",
      status: "processing",
      payloadHash: input.payloadHash,
    })
    .onConflictDoNothing()
    .returning({ id: channelEventsTable.id });
  if (inserted) return inserted.id;

  const [retried] = await db
    .update(channelEventsTable)
    .set({ status: "processing", lastErrorCode: null })
    .where(
      and(
        eq(channelEventsTable.provider, input.provider),
        eq(channelEventsTable.externalId, input.messageId),
        eq(channelEventsTable.status, "failed"),
      ),
    )
    .returning({ id: channelEventsTable.id });
  return retried?.id ?? null;
}

/**
 * Shared inbound path for Meta Cloud API and Baileys (WhatsApp Web) demos.
 * Caller owns transport auth + outbound delivery.
 */
export async function processInboundWhatsAppMessage(input: {
  provider: "meta" | "baileys";
  baker: typeof bakersTable.$inferSelect;
  msg: WhatsAppInboundMessage;
  payloadHash: string;
  sendText: WhatsAppOutboundSender;
}): Promise<"skipped" | "duplicate" | "ok" | "failed"> {
  const { baker, msg, payloadHash, sendText, provider } = input;

  if (!baker.whatsappAgentEnabled || !baker.agentActive) {
    logger.info({ bakerId: baker.id, provider }, "WhatsApp agent disabled — skipping auto-reply");
    return "skipped";
  }

  const eventId = await claimChannelMessage({
    provider,
    bakerId: baker.id,
    messageId: msg.messageId,
    payloadHash,
  });
  if (!eventId) {
    logger.info({ messageId: msg.messageId, provider }, "Skipping duplicate WhatsApp message");
    return "duplicate";
  }

  try {
    if (msg.imageBytes && msg.imageContentType) {
      const phone = normalizePakistanPhone(msg.from) ?? msg.from;
      const match = (
        await db
          .select()
          .from(ordersTable)
          .where(and(eq(ordersTable.bakerId, baker.id), eq(ordersTable.paymentStatus, "pending")))
          .orderBy(desc(ordersTable.createdAt))
          .limit(30)
      ).find((o) => phonesMatch(o.buyerWhatsapp, phone));

      if (match) {
        try {
          const dataUrl = toReceiptDataUrl(msg.imageBytes, msg.imageContentType);
          await db
            .update(ordersTable)
            .set({ paymentScreenshotUrl: dataUrl })
            .where(eq(ordersTable.id, match.id));

          await logOrderActivity({
            orderId: match.id,
            bakerId: baker.id,
            actor: { actorType: "buyer" },
            action: "receipt_upload",
            metadata: { method: provider === "baileys" ? "whatsapp_baileys" : "whatsapp_webhook" },
          });
          await db.insert(notificationsTable).values({
            bakerId: baker.id,
            type: "payment.receipt_uploaded",
            title: `WhatsApp receipt for order #${match.id}`,
            message: `${match.buyerName} sent a payment photo on WhatsApp. Review in Payments.`,
            relatedId: match.id,
            relatedType: "order",
          });
          const ocrHint = await ocrWhatsAppImageHint(
            msg.imageBytes,
            match.totalPkr,
            baker.advancePercentage ?? 50,
            baker.whatsappNumber,
            baker.businessName,
          );
          if (ocrHint) {
            msg.text = `${msg.text}\n${ocrHint}`;
            const isVerified = ocrHint.includes("This looks like a payment receipt");
            await logOrderActivity({
              orderId: match.id,
              bakerId: baker.id,
              actor: { actorType: "buyer" },
              action: "ocr_verification",
              metadata: {
                verified: isVerified,
                hint: ocrHint,
                method: "whatsapp",
              },
            });
          }
        } catch (attachErr) {
          logger.warn({ err: attachErr, orderId: match.id }, "Could not attach WA receipt image");
        }
      } else {
        const ocrHint = await ocrWhatsAppImageHint(msg.imageBytes);
        if (ocrHint) msg.text = `${msg.text}\nOCR preview: ${ocrHint.slice(0, 300)}`;
      }
    }

    const pendingFeedback = await findPendingFeedbackOrder(baker.id, msg.from);
    const feedbackReply = parseFeedbackReply(msg.text);
    if (pendingFeedback && feedbackReply) {
      await recordOrderFeedback({
        orderId: pendingFeedback.id,
        feedback: feedbackReply,
        buyerWhatsapp: msg.from,
      });
      const thankYou =
        feedbackReply === "had_issue"
          ? `We're sorry to hear that. ${baker.ownerName || baker.businessName} will review order #${pendingFeedback.id} and get back to you soon.`
          : `Shukriya for your feedback on order #${pendingFeedback.id}! We love serving you. — ${baker.businessName}`;
      await sendText(msg.from, thankYou);
      await db
        .update(channelEventsTable)
        .set({ status: "completed", completedAt: new Date(), lastErrorCode: null })
        .where(eq(channelEventsTable.id, eventId));
      return "ok";
    }

    const cap = await isWhatsAppCapReached(baker.id, baker.subscriptionPlan);
    if (cap.capped) {
      const capMessage =
        cap.limit <= 0
          ? `Thanks for messaging ${baker.businessName}! WhatsApp agent is available on paid plans. Visit our web menu to order, or message the baker directly.`
          : `Thanks for messaging ${baker.businessName}! Our WhatsApp chat limit for this month (${cap.limit} conversations) has been reached. Please visit our menu link or call us to place your order.`;
      await sendText(msg.from, capMessage);
      await db
        .update(channelEventsTable)
        .set({ status: "completed", completedAt: new Date(), lastErrorCode: "WHATSAPP_CAP" })
        .where(eq(channelEventsTable.id, eventId));
      return "ok";
    }

    const result = await processChatMessage({
      bakerId: baker.id,
      message: msg.text,
      channel: "whatsapp",
      buyerWhatsapp: msg.from,
      sessionId: `wa-${baker.id}-${msg.from}`,
    });

    const sent = await sendText(msg.from, result.reply);
    if (!sent) throw new Error("WhatsApp outbound reply failed.");

    await db
      .update(channelEventsTable)
      .set({ status: "completed", completedAt: new Date(), lastErrorCode: null })
      .where(eq(channelEventsTable.id, eventId));
    return "ok";
  } catch (error) {
    await db
      .update(channelEventsTable)
      .set({ status: "failed", lastErrorCode: "PROCESSING_FAILED" })
      .where(eq(channelEventsTable.id, eventId));
    throw error;
  }
}
