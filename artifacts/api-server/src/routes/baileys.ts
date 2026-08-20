import { Router, type Request, type Response } from "express";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";
import {
  getBaileysStatus,
  isBaileysConfigured,
  isBaileysConnectedForBaker,
  isBaileysRuntimeSupported,
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

function isBaileysWorkerProcess(): boolean {
  return process.env.BAILEYS_WORKER === "1" || process.env.BAILEYS_WORKER === "true";
}

/** Vercel (or any API without a live socket) forwards control to the always-on worker. */
function shouldProxyToBridge(): boolean {
  if (isBaileysWorkerProcess()) return false;
  if (!bridgeBaseUrl()) return false;
  // Prefer local socket when this process can host Baileys itself.
  if (isBaileysConfigured() && isBaileysRuntimeSupported()) return false;
  return true;
}

function assertBridgeSecret(req: Request, res: Response): boolean {
  const expected = bridgeSecret();
  if (!expected) return true;
  const got = req.header("x-baileys-bridge-secret");
  if (got !== expected) {
    res.status(401).json({ error: "Invalid Baileys bridge secret." });
    return false;
  }
  return true;
}

async function proxyToBridge(
  req: Request,
  res: Response,
  bakerId: number,
  method: "GET" | "POST",
  suffix: "status" | "start" | "logout",
): Promise<boolean> {
  if (!shouldProxyToBridge()) return false;

  const base = bridgeBaseUrl()!;
  const url = `${base}/api/bakers/${bakerId}/baileys/${suffix}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = req.header("authorization");
  if (auth) headers.Authorization = auth;
  const secret = bridgeSecret();
  if (secret) headers["x-baileys-bridge-secret"] = secret;

  try {
    const upstream = await fetch(url, { method, headers });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(text || "{}");
  } catch (error) {
    res.status(502).json({
      error:
        "Baileys bridge is unreachable. Start the always-on worker (Docker/Railway) and check BAILEYS_BRIDGE_URL.",
      detail: error instanceof Error ? error.message : String(error),
      docs: "/docs/baileys-bridge.md",
    });
  }
  return true;
}

function vercelCannotHostSocket(): boolean {
  return Boolean(process.env.VERCEL) && !shouldProxyToBridge() && !isBaileysWorkerProcess();
}

/** Unauthenticated health for Docker/Railway healthchecks. */
router.get("/baileys/health", (_req, res): void => {
  const status = getBaileysStatus();
  res.json({
    ok: true,
    worker: isBaileysWorkerProcess() || (isBaileysConfigured() && isBaileysRuntimeSupported()),
    bridgeProxy: shouldProxyToBridge(),
    bridgeUrlConfigured: Boolean(bridgeBaseUrl()),
    baileys: {
      status: status.status,
      bakerId: status.bakerId,
      phoneNumber: status.phoneNumber,
      available: status.available,
    },
  });
});

router.get(
  "/bakers/:bakerId/baileys/status",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    if (!assertBridgeSecret(req, res)) return;
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
          "WhatsApp Web (Baileys) needs the always-on bridge. Vercel serverless cannot keep the socket open.",
        note:
          "Run Dockerfile.baileys / docker-compose.baileys.yml or Railway, then set BAILEYS_BRIDGE_URL on Vercel. See docs/baileys-bridge.md.",
        demoOnly: true,
        bridgeMode: "unavailable",
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
      bridgeMode: isBaileysWorkerProcess() ? "worker" : "local",
    });
  },
);

router.post(
  "/bakers/:bakerId/baileys/start",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    if (!assertBridgeSecret(req, res)) return;
    const bakerId = Number(req.params.bakerId);
    if (await proxyToBridge(req, res, bakerId, "POST", "start")) return;

    if (vercelCannotHostSocket()) {
      res.status(503).json({
        error:
          "Cannot start Baileys on Vercel. Start the bridge worker (docker compose -f docker-compose.baileys.yml up), then set BAILEYS_BRIDGE_URL on Vercel.",
      });
      return;
    }

    const configured = Number(process.env.BAILEYS_BAKER_ID || "0");
    if (configured > 0 && configured !== bakerId) {
      res.status(403).json({
        error: `This demo bridge is locked to baker #${configured}. Set BAILEYS_BAKER_ID=${bakerId} on the worker.`,
      });
      return;
    }
    process.env.BAILEYS_BAKER_ID = String(bakerId);
    process.env.BAILEYS_ENABLED = "1";
    const status = await startBaileysBridge();
    res.json({ ...status, bridgeMode: isBaileysWorkerProcess() ? "worker" : "local" });
  },
);

router.post(
  "/bakers/:bakerId/baileys/logout",
  requireBakerAuth,
  requireBakerOwnership,
  async (req, res): Promise<void> => {
    if (!assertBridgeSecret(req, res)) return;
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
    res.json({ ...status, bridgeMode: isBaileysWorkerProcess() ? "worker" : "local" });
  },
);

export default router;
