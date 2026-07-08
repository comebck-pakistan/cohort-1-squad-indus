import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, chatMessagesTable, bakersTable, productsTable } from "@workspace/db";
import { SendChatMessageBody, GetChatHistoryParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Simple rule-based agent (no external API needed for demo)
async function generateAgentReply(
  bakerId: number,
  message: string
): Promise<{ reply: string; action: string | null; cartItemId: number | null; escalated: boolean }> {
  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) {
    return { reply: "Baker not found.", action: null, cartItemId: null, escalated: false };
  }
  if (!baker.agentActive) {
    return {
      reply: `${baker.businessName}'s assistant is currently unavailable. Please try again later.`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  const products = await db.select().from(productsTable).where(eq(productsTable.bakerId, bakerId));
  const lowerMsg = message.toLowerCase();

  // Price list
  if (lowerMsg.includes("price") || lowerMsg.includes("menu") || lowerMsg.includes("what do you have") || lowerMsg.includes("list")) {
    const available = products.filter((p) => p.isAvailable);
    if (available.length === 0) {
      return { reply: `${baker.businessName} doesn't have any products listed yet. Please check back soon!`, action: null, cartItemId: null, escalated: false };
    }
    const list = available.map((p) => {
      const sizes = (p.sizes as Array<{ label: string; pricePkr: number }>) ?? [];
      const priceStr = sizes.length > 0
        ? sizes.map((s) => `${s.label}: PKR ${s.pricePkr.toLocaleString()}`).join(", ")
        : `PKR ${p.basePricePkr.toLocaleString()}`;
      return `• *${p.name}* — ${priceStr}${p.isEgglessAvailable ? " (eggless available)" : ""}`;
    }).join("\n");
    return { reply: `Here's ${baker.businessName}'s menu:\n\n${list}\n\nWhat would you like to order? 🎂`, action: null, cartItemId: null, escalated: false };
  }

  // Eggless
  if (lowerMsg.includes("eggless") || lowerMsg.includes("egg")) {
    const eggless = products.filter((p) => p.isEgglessAvailable && p.isAvailable);
    if (eggless.length === 0) {
      return { reply: `Unfortunately, ${baker.businessName} doesn't offer eggless options at the moment. Would you like to see what else is available?`, action: null, cartItemId: null, escalated: false };
    }
    const list = eggless.map((p) => `• ${p.name}`).join("\n");
    return { reply: `Great news! These items are available in eggless:\n\n${list}\n\nWould you like to order any of these?`, action: null, cartItemId: null, escalated: false };
  }

  // Delivery
  if (lowerMsg.includes("deliver") || lowerMsg.includes("area") || lowerMsg.includes("location")) {
    const areas = (baker.deliveryAreas ?? []).join(", ");
    return {
      reply: areas
        ? `${baker.businessName} delivers to: ${areas}. Pickup is also available. Which area are you in?`
        : `Please contact ${baker.businessName} directly on WhatsApp to confirm delivery to your area.`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  // Payment
  if (lowerMsg.includes("pay") || lowerMsg.includes("payment") || lowerMsg.includes("cod") || lowerMsg.includes("cash")) {
    const policy = baker.codPolicy ?? "Cash on delivery (COD) only. Full payment required at the time of delivery.";
    return { reply: `Payment policy: ${policy}`, action: null, cartItemId: null, escalated: false };
  }

  // Order / how to order
  if (lowerMsg.includes("order") || lowerMsg.includes("want") || lowerMsg.includes("buy")) {
    return {
      reply: `To place an order with ${baker.businessName}, just add items to your cart on their profile page and complete checkout. You can also tell me what you'd like and I'll help you!\n\nWhat would you like to order?`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  // Complaint / escalation
  if (lowerMsg.includes("complain") || lowerMsg.includes("problem") || lowerMsg.includes("issue") || lowerMsg.includes("wrong") || lowerMsg.includes("bad")) {
    return {
      reply: `I'm sorry to hear you're having an issue. I've flagged this for ${baker.businessName} and they'll be in touch with you shortly. You can also reach them directly on WhatsApp.`,
      action: "escalate", cartItemId: null, escalated: true,
    };
  }

  // Availability check
  for (const product of products) {
    if (lowerMsg.includes(product.name.toLowerCase())) {
      if (!product.isAvailable) {
        const alternatives = products.filter((p) => p.isAvailable && p.category === product.category);
        const altText = alternatives.length > 0
          ? ` You might also like: ${alternatives.map((p) => p.name).join(", ")}.`
          : "";
        return { reply: `${product.name} is currently sold out.${altText}`, action: null, cartItemId: null, escalated: false };
      }
      const sizes = (product.sizes as Array<{ label: string; pricePkr: number }>) ?? [];
      const priceStr = sizes.length > 0
        ? `Sizes: ${sizes.map((s) => `${s.label} PKR ${s.pricePkr.toLocaleString()}`).join(", ")}`
        : `PKR ${product.basePricePkr.toLocaleString()}`;
      const leadText = product.leadTimeDays > 0 ? ` Ready in ${product.leadTimeDays} day${product.leadTimeDays > 1 ? "s" : ""}.` : "";
      return {
        reply: `${product.name} is available! ${priceStr}.${leadText}${product.isEgglessAvailable ? " Eggless version available." : ""}\n\nWould you like to add it to your cart?`,
        action: null, cartItemId: null, escalated: false,
      };
    }
  }

  // Greeting
  if (lowerMsg.includes("hello") || lowerMsg.includes("hi") || lowerMsg.includes("salam") || lowerMsg.includes("assalam")) {
    const available = products.filter((p) => p.isAvailable);
    return {
      reply: `Assalam-o-Alaikum! Welcome to ${baker.businessName}. I'm ${baker.businessName}'s assistant, here to help you with orders and questions.\n\nWe have ${available.length} items available. Would you like to see our menu?`,
      action: null, cartItemId: null, escalated: false,
    };
  }

  // Default
  return {
    reply: `Thanks for your message! I'll let ${baker.businessName} know you reached out. In the meantime, you can browse the full menu on their profile. Is there anything specific you're looking for?`,
    action: null, cartItemId: null, escalated: false,
  };
}

// POST /chat
router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { bakerId, buyerId, message, sessionId } = parsed.data;
  const sid = sessionId ?? `session-${bakerId}-${buyerId ?? 0}-${Date.now()}`;

  // Save user message
  await db.insert(chatMessagesTable).values({
    bakerId,
    buyerId: buyerId ?? null,
    sessionId: sid,
    role: "user",
    content: message,
  });

  const agentReply = await generateAgentReply(bakerId, message);

  // Save agent reply
  await db.insert(chatMessagesTable).values({
    bakerId,
    buyerId: buyerId ?? null,
    sessionId: sid,
    role: "assistant",
    content: agentReply.reply,
  });

  res.json({
    reply: agentReply.reply,
    sessionId: sid,
    action: agentReply.action,
    cartItemId: agentReply.cartItemId,
    escalated: agentReply.escalated,
  });
});

// GET /chat/:bakerId/history/:buyerId
router.get("/chat/:bakerId/history/:buyerId", async (req, res): Promise<void> => {
  const params = GetChatHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const messages = await db.select().from(chatMessagesTable)
    .where(and(
      eq(chatMessagesTable.bakerId, params.data.bakerId),
      eq(chatMessagesTable.buyerId, params.data.buyerId)
    ))
    .orderBy(chatMessagesTable.createdAt);
  res.json(messages);
});

export default router;
