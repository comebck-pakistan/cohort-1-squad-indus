import { useCallback, useEffect, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { QrCode, RefreshCw, Unplug, Wifi } from "lucide-react";

type BaileysStatus = {
  enabled: boolean;
  available: boolean;
  status: "disabled" | "starting" | "qr" | "connected" | "logged_out" | "error";
  bakerId: number | null;
  phoneNumber: string | null;
  qrDataUrl: string | null;
  lastError: string | null;
  connectedForThisBaker?: boolean;
  note: string;
};

type Props = {
  bakerId: number;
  onConnectedChange?: (connected: boolean) => void;
};

export function BaileysDemoPanel({ bakerId, onConnectedChange }: Props) {
  const [status, setStatus] = useState<BaileysStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const next = await customFetch<BaileysStatus>(`/api/bakers/${bakerId}/baileys/status`, {
        responseType: "json",
      });
      setStatus(next);
      onConnectedChange?.(Boolean(next.connectedForThisBaker));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Baileys status.");
    }
  }, [bakerId, onConnectedChange]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 4_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const next = await customFetch<BaileysStatus>(`/api/bakers/${bakerId}/baileys/start`, {
        method: "POST",
        responseType: "json",
      });
      setStatus(next);
      onConnectedChange?.(next.status === "connected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start Baileys.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const next = await customFetch<BaileysStatus>(`/api/bakers/${bakerId}/baileys/logout`, {
        method: "POST",
        responseType: "json",
      });
      setStatus(next);
      onConnectedChange?.(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not log out Baileys.");
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.connectedForThisBaker === true;

  return (
    <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <QrCode className="w-4 h-4 text-muted-foreground" />
        Demo day: WhatsApp Web (Baileys)
      </h3>
      <p className="text-xs text-muted-foreground">
        Unofficial WhatsApp Web for demo day. The Sweet Tooth app stays on Vercel; the WhatsApp
        socket must run on an always-on worker. Set <code>BAILEYS_BRIDGE_URL</code> on Vercel to
        that worker, or use Meta for fully native Vercel WhatsApp.
      </p>

      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs space-y-1">
        <p>
          Status:{" "}
          <span className={connected ? "text-green-700 font-medium" : "font-medium"}>
            {status?.status ?? "…"}
          </span>
          {status?.phoneNumber ? ` · linked ${status.phoneNumber}` : ""}
        </p>
        <p className="text-muted-foreground">{status?.note}</p>
        {status?.lastError ? <p className="text-red-600">{status.lastError}</p> : null}
        {error ? <p className="text-red-600">{error}</p> : null}
      </div>

      {status?.qrDataUrl ? (
        <div className="flex flex-col items-center gap-2">
          <img
            src={status.qrDataUrl}
            alt="Scan with WhatsApp Linked Devices"
            className="h-56 w-56 rounded-lg border border-border bg-white p-2"
          />
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            On your phone: WhatsApp → Linked devices → Link a device → scan this QR.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void start()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Wifi className="w-3.5 h-3.5" />
          {busy ? "Working…" : connected ? "Reconnect" : "Show QR / Start"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        {connected || status?.status === "qr" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-red-700"
          >
            <Unplug className="w-3.5 h-3.5" />
            Unlink
          </button>
        ) : null}
      </div>
    </div>
  );
}
