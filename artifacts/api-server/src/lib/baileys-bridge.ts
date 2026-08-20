import crypto from "crypto";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { bakersTable, db } from "@workspace/db";
import { logger } from "./logger.js";
import { normalizePhone, type WhatsAppInboundMessage } from "./whatsapp.js";
import { processInboundWhatsAppMessage } from "./whatsapp-inbound.js";

export type BaileysStatus = {
  enabled: boolean;
  available: boolean;
  status: "disabled" | "starting" | "qr" | "connected" | "logged_out" | "error";
  bakerId: number | null;
  phoneNumber: string | null;
  qrDataUrl: string | null;
  lastError: string | null;
  demoOnly: true;
  note: string;
};

type BaileysSocket = {
  ev: {
    on: (event: string, listener: (...args: any[]) => void) => void;
    off?: (event: string, listener: (...args: any[]) => void) => void;
  };
  sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
  end?: (error?: Error) => void;
  logout?: () => Promise<void>;
  user?: { id?: string };
};

let sock: BaileysSocket | null = null;
let connecting = false;
let status: BaileysStatus["status"] = "disabled";
let qrDataUrl: string | null = null;
let phoneNumber: string | null = null;
let lastError: string | null = null;
let bakerIdCache: number | null = null;

function authDir(): string {
  return (
    process.env.BAILEYS_AUTH_DIR?.trim() ||
    path.resolve(process.cwd(), ".baileys-auth")
  );
}

export function isBaileysConfigured(): boolean {
  return process.env.BAILEYS_ENABLED === "1" || process.env.BAILEYS_ENABLED === "true";
}

export function isBaileysRuntimeSupported(): boolean {
  // Persistent WebSocket sessions do not survive Vercel serverless invocations.
  // BAILEYS_WORKER=1 marks an always-on Docker/Railway process.
  if (process.env.BAILEYS_WORKER === "1" || process.env.BAILEYS_WORKER === "true") return true;
  return !process.env.VERCEL;
}

function resolveBakerId(): number | null {
  const raw = process.env.BAILEYS_BAKER_ID?.trim();
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function loadBaker() {
  const bakerId = resolveBakerId();
  if (!bakerId) return null;
  const [baker] = await db
    .select()
    .from(bakersTable)
    .where(eq(bakersTable.id, bakerId))
    .limit(1);
  return baker ?? null;
}

async function toQrDataUrl(qr: string): Promise<string | null> {
  try {
    const QRCode = await import("qrcode");
    return await QRCode.toDataURL(qr, { margin: 1, width: 320 });
  } catch (err) {
    logger.warn({ err }, "Could not render Baileys QR as data URL");
    return null;
  }
}

function jidToPhone(jid: string): string {
  return normalizePhone(jid.split("@")[0] ?? "");
}

function phoneToJid(phone: string): string {
  const digits = normalizePhone(phone);
  return `${digits}@s.whatsapp.net`;
}

export function getBaileysStatus(): BaileysStatus {
  const enabled = isBaileysConfigured();
  return {
    enabled,
    available: enabled && isBaileysRuntimeSupported(),
    status: enabled ? status : "disabled",
    bakerId: bakerIdCache ?? resolveBakerId(),
    phoneNumber,
    qrDataUrl: status === "qr" ? qrDataUrl : null,
    lastError,
    demoOnly: true,
    note: enabled
      ? isBaileysRuntimeSupported()
        ? "Unofficial WhatsApp Web bridge for demo day. Scan the QR once, then message this number."
        : "Baileys needs the always-on bridge worker (Docker/Railway). Set BAILEYS_BRIDGE_URL on Vercel — see docs/baileys-bridge.md."
      : "Set BAILEYS_ENABLED=1 and BAILEYS_BAKER_ID on the always-on bridge worker, then BAILEYS_BRIDGE_URL on Vercel.",
  };
}

export async function sendBaileysText(to: string, body: string): Promise<boolean> {
  if (!sock || status !== "connected") {
    logger.warn("Baileys socket not connected — cannot send");
    return false;
  }
  try {
    await sock.sendMessage(phoneToJid(to), { text: body });
    return true;
  } catch (err) {
    logger.error({ err, to }, "Baileys send failed");
    return false;
  }
}

export function isBaileysConnectedForBaker(bakerId: number): boolean {
  return status === "connected" && resolveBakerId() === bakerId;
}

async function handleInbound(msg: WhatsAppInboundMessage, payloadHash: string): Promise<void> {
  const baker = await loadBaker();
  if (!baker) {
    logger.warn({ bakerId: resolveBakerId() }, "Baileys inbound: baker not found");
    return;
  }
  bakerIdCache = baker.id;
  await processInboundWhatsAppMessage({
    provider: "baileys",
    baker,
    msg,
    payloadHash,
    sendText: sendBaileysText,
  });
}

export async function startBaileysBridge(): Promise<BaileysStatus> {
  if (!isBaileysConfigured()) {
    status = "disabled";
    return getBaileysStatus();
  }
  if (!isBaileysRuntimeSupported()) {
    status = "error";
    lastError = "Baileys cannot run on Vercel serverless. Use a local or always-on API host.";
    return getBaileysStatus();
  }
  if (!resolveBakerId()) {
    status = "error";
    lastError = "BAILEYS_BAKER_ID is required (e.g. 1).";
    return getBaileysStatus();
  }
  if (connecting || status === "connected" || status === "qr") {
    return getBaileysStatus();
  }

  connecting = true;
  status = "starting";
  lastError = null;
  bakerIdCache = resolveBakerId();

  try {
    const baileys = await import("@whiskeysockets/baileys");
    const makeWASocket =
      (baileys as any).default?.default ??
      (baileys as any).default ??
      (baileys as any).makeWASocket;
    const {
      useMultiFileAuthState,
      DisconnectReason,
      fetchLatestBaileysVersion,
      makeCacheableSignalKeyStore,
    } = baileys as any;
    const { Boom } = await import("@hapi/boom");

    fs.mkdirSync(authDir(), { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(authDir());
    const versionInfo = await fetchLatestBaileysVersion().catch(() => null);
    const pino = (await import("pino")).default;
    const quiet = pino({ level: "silent" });

    sock = makeWASocket({
      version: versionInfo?.version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, quiet),
      },
      printQRInTerminal: false,
      logger: quiet,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    }) as BaileysSocket;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update ?? {};
      if (qr) {
        status = "qr";
        qrDataUrl = await toQrDataUrl(qr);
        logger.info("Baileys QR ready — scan from Agent Hub or phone Linked Devices");
      }
      if (connection === "open") {
        status = "connected";
        qrDataUrl = null;
        phoneNumber = sock?.user?.id ? jidToPhone(sock.user.id) : phoneNumber;
        lastError = null;
        logger.info({ phoneNumber, bakerId: bakerIdCache }, "Baileys WhatsApp connected");
      }
      if (connection === "close") {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        sock = null;
        connecting = false;
        if (loggedOut) {
          status = "logged_out";
          phoneNumber = null;
          qrDataUrl = null;
          lastError = "Session logged out. Start again and scan a new QR.";
          return;
        }
        status = "starting";
        const boomStatus = lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : code;
        logger.warn({ boomStatus }, "Baileys disconnected — reconnecting");
        setTimeout(() => {
          void startBaileysBridge();
        }, 2_000);
      }
    });

    sock.ev.on("messages.upsert", async (upsert: any) => {
      try {
        if (upsert?.type !== "notify") return;
        for (const raw of upsert.messages ?? []) {
          if (raw.key?.fromMe) continue;
          const remoteJid = String(raw.key?.remoteJid ?? "");
          if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") continue;

          const from = jidToPhone(remoteJid);
          if (!from) continue;

          const messageId = String(raw.key?.id ?? `${Date.now()}`);
          const text =
            raw.message?.conversation ||
            raw.message?.extendedTextMessage?.text ||
            raw.message?.imageMessage?.caption ||
            "";

          const hasImage = Boolean(raw.message?.imageMessage);
          if (!text && !hasImage) continue;

          const msg: WhatsAppInboundMessage = {
            from,
            messageId,
            text: text
              ? String(text)
              : "[Buyer sent a photo] Please confirm if this is a payment receipt or ask your question in text.",
            phoneNumberId: "baileys",
            displayPhoneNumber: phoneNumber ?? undefined,
          };

          const payloadHash = crypto
            .createHash("sha256")
            .update(`${messageId}:${from}:${msg.text}`)
            .digest("hex");

          await handleInbound(msg, payloadHash);
        }
      } catch (err) {
        logger.error({ err }, "Baileys messages.upsert failed");
      }
    });

    connecting = false;
    return getBaileysStatus();
  } catch (err) {
    connecting = false;
    sock = null;
    status = "error";
    lastError = err instanceof Error ? err.message : "Failed to start Baileys";
    logger.error({ err }, "Baileys start failed");
    return getBaileysStatus();
  }
}

export async function stopBaileysBridge(logout = false): Promise<BaileysStatus> {
  try {
    if (logout && sock?.logout) {
      await sock.logout();
    } else {
      sock?.end?.(undefined);
    }
  } catch (err) {
    logger.warn({ err }, "Baileys stop error");
  }
  sock = null;
  connecting = false;
  status = logout ? "logged_out" : "disabled";
  qrDataUrl = null;
  if (logout) phoneNumber = null;
  return getBaileysStatus();
}

export async function maybeAutostartBaileys(): Promise<void> {
  if (!isBaileysConfigured() || !isBaileysRuntimeSupported()) return;
  logger.info({ bakerId: resolveBakerId() }, "Autostarting Baileys demo bridge");
  await startBaileysBridge();
}
