import { Router, type Request, type Response } from "express";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";
import {
  getBaileysStatus,
  isBaileysConnectedForBaker,
  startBaileysBridge,
  stopBaileysBridge,
} from "../lib/baileys-bridge.js";

const router = Router();

function bridgeBaseUrl(): string | null {
  const raw = process.env.BAILEYS_BRIDGE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function bridgeSecret(): string | undefined {
  return process.env.BAILEYS_BRIDGE_SECRET?.trim() || undefined;
}

/** On Vercel, forward Baileys control to an always-on worker that holds the WhatsApp socket. */
async function proxyToBridge(
  req: Request,
  res: Response,
  bakerId: number,
  method: "GET" | "POST",
  suffix: "status" | "start" | "logout",
): Promise<boolean> {
  const base = bridgeBaseUrl();
  if (!base) return false;

  const url = `${base}/api/bakers/${bakerId}/baileys/${suffix}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const auth = req.header("authorization");
  if (auth) headers.Authorization = auth;
  const secret = bridgeSecret();
  if (secret) headers["x-baileys-bridge-secret"] = secret;

  try {
    const upstream = await fetch(url, { method, headers });
    const text = await upstream.text();
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", contentType);
    res.send(text || "{}");
  } catch (error) {
    res.status(502).json({
      error:
        "Baileys bridge is unreachable. Keep the always-on worker running (Railway/Fly) and check BAILEYS_BRIDGE_URL.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  return true;
}

function vercelCannotHostSocket(): boolean {
  return Boolean(process.env.VERCEL) && !bridgeBaseUrl();
}

/** Status for the baker that owns the demo session. */
router.get(
  "/bakers/:bakerId/baileys/status",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    if (await proxyToBridge(req, res, bakerId, "GET", "status")) return;

    if (vercelCannotHostSocket()) {
      res.json({
        ...getBaileysStatus(),
        enabled: false,
        available: false,
        status: "error",
        bakerId,
        connectedForThisBaker: false,
        qrDataUrl: null,
        phoneNumber: null,
        lastError:
          "WhatsApp Web (Baileys) needs a persistent socket. Vercel serverless cannot keep it open.",
        note:
          "Set BAILEYS_BRIDGE_URL on Vercel to your always-on API (Railway/Fly) that runs with BAILEYS_ENABLED=1. Or use Meta Embedded Signup for native Vercel WhatsApp.",
        demoOnly: true,
      });
      return;
    }

    const status = getBaileysStatus();
    const mine = status.bakerId === bakerId;
    res.json({
      ...status,
      connectedForThisBaker: isBaileysConnectedForBaker(bakerId),
      qrDataUrl: mine ? status.qrDataUrl : null,
      phoneNumber: mine ? status.phoneNumber : null,
    });
  },
);

router.post(
  "/bakers/:bakerId/baileys/start",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    if (await proxyToBridge(req, res, bakerId, "POST", "start")) return;

    if (vercelCannotHostSocket()) {
      res.status(503).json({
        error:
          "Cannot start Baileys on Vercel. Deploy the API as an always-on worker (Railway/Fly), set BAILEYS_ENABLED=1 there, then set BAILEYS_BRIDGE_URL on Vercel to that worker URL.",
      });
      return;
    }

    const configured = Number(process.env.BAILEYS_BAKER_ID || "0");
    if (configured > 0 && configured !== bakerId) {
      res.status(403).json({
        error: `This demo bridge is locked to baker #${configured}. Set BAILEYS_BAKER_ID=${bakerId} on the API host to use your bakery.`,
      });
      return;
    }
    process.env.BAILEYS_BAKER_ID = String(bakerId);
    process.env.BAILEYS_ENABLED = "1";
    const status = await startBaileysBridge();
    res.json(status);
  },
);

router.post(
  "/bakers/:bakerId/baileys/logout",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    if (await proxyToBridge(req, res, bakerId, "POST", "logout")) return;

    if (vercelCannotHostSocket()) {
      res.status(503).json({
        error: "No local Baileys session on Vercel. Configure BAILEYS_BRIDGE_URL to unlink on the worker.",
      });
      return;
    }

    if (getBaileysStatus().bakerId !== bakerId) {
      res.status(403).json({ error: "This Baileys session belongs to another bakery." });
      return;
    }
    const status = await stopBaileysBridge(true);
    res.json(status);
  },
);

export default router;
