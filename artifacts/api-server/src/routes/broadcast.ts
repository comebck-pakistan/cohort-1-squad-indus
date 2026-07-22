import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, metaConnectionsTable, customersTable } from "@workspace/db";
import {
  type AuthenticatedRequest,
  requireBakerAuth,
  requireBakerOwnership,
} from "../middlewares/auth.js";
import { decryptSecret } from "../lib/secret-box.js";
import { sendWhatsAppTextMessage } from "../lib/whatsapp.js";
import { rateLimit } from "../middlewares/rate-limiter.js";

const router = Router();

router.post(
  "/bakers/:bakerId/broadcast",
  requireBakerAuth,
  requireBakerOwnership,
  rateLimit(10, 15 * 60 * 1000),
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    const parsed = z.object({
      message: z.string().trim().min(5).max(900),
      /** When set, send a single test message instead of segment blast. */
      testPhone: z.string().trim().min(10).max(24).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    const [connection] = await db
      .select()
      .from(metaConnectionsTable)
      .where(eq(metaConnectionsTable.bakerId, bakerId))
      .limit(1);

    if (
      !encryptionKey ||
      !connection?.whatsappPhoneNumberId ||
      !connection.whatsappAccessTokenEncrypted
    ) {
      res.status(409).json({
        error: "Connect WhatsApp Business in Agent Hub before sending broadcasts.",
        connected: false,
      });
      return;
    }

    let accessToken: string;
    try {
      accessToken = decryptSecret(connection.whatsappAccessTokenEncrypted, encryptionKey);
    } catch {
      res.status(500).json({ error: "Could not unlock the bakery WhatsApp token." });
      return;
    }

    if (parsed.data.testPhone) {
      const ok = await sendWhatsAppTextMessage(
        connection.whatsappPhoneNumberId,
        parsed.data.testPhone,
        parsed.data.message,
        accessToken,
      );
      res.json({
        mode: "test",
        sent: ok ? 1 : 0,
        failed: ok ? 0 : 1,
        connected: true,
      });
      return;
    }

    const customers = await db
      .select({ phone: customersTable.whatsappNumber, name: customersTable.name })
      .from(customersTable)
      .where(eq(customersTable.bakerId, bakerId))
      .limit(parsed.data.limit ?? 50);

    let sent = 0;
    let failed = 0;
    for (const customer of customers) {
      if (!customer.phone) {
        failed += 1;
        continue;
      }
      const ok = await sendWhatsAppTextMessage(
        connection.whatsappPhoneNumberId,
        customer.phone,
        parsed.data.message,
        accessToken,
      );
      if (ok) sent += 1;
      else failed += 1;
    }

    res.json({
      mode: "segment",
      targeted: customers.length,
      sent,
      failed,
      connected: true,
    });
  },
);

export default router;
