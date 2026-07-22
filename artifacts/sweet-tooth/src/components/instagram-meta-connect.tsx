import { useCallback, useEffect, useRef, useState } from "react";
import { customFetch } from "@workspace/api-client-react";

type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

type InstagramSignupSession = {
  page_id?: string;
  instagram_profile_id?: string;
  instagram_account_id?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type ConnectionStatus = {
  instagram: {
    connected: boolean;
    accountId: string | null;
    pageId: string | null;
  };
};

/**
 * Instagram Meta connect via Facebook Login / Embedded Signup.
 * Prefers VITE_META_IG_CONFIG_ID; falls back to VITE_META_CONFIG_ID when unset.
 */
export function InstagramMetaConnect() {
  const appId = import.meta.env.VITE_META_APP_ID;
  const configId =
    import.meta.env.VITE_META_IG_CONFIG_ID || import.meta.env.VITE_META_CONFIG_ID;
  const usingSharedConfig = !import.meta.env.VITE_META_IG_CONFIG_ID && !!import.meta.env.VITE_META_CONFIG_ID;
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pageIdHint, setPageIdHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualPageId, setManualPageId] = useState("");
  const [manualIgId, setManualIgId] = useState("");
  const codeRef = useRef<string | null>(null);
  const sessionRef = useRef<InstagramSignupSession | null>(null);

  const [pendingCode, setPendingCode] = useState(false);

  const refreshStatus = useCallback(async () => {
    const status = await customFetch<ConnectionStatus>("/api/meta/connections", {
      responseType: "json",
    });
    setConnected(status.instagram.connected);
    setPageIdHint(status.instagram.pageId);
  }, []);

  useEffect(() => {
    void refreshStatus().catch(() => undefined);
  }, [refreshStatus]);

  const completeWhenReady = useCallback(async () => {
    const code = codeRef.current;
    const session = sessionRef.current;
    const pageId = session?.page_id || manualPageId.trim();
    const instagramAccountId =
      session?.instagram_profile_id ||
      session?.instagram_account_id ||
      manualIgId.trim();
    if (!code) return;
    if (!pageId || !instagramAccountId) {
      setConnecting(false);
      setPendingCode(true);
      setError(
        "Authorization code received. Enter Facebook Page ID and Instagram Account ID above, then click Finish connection (codes expire in ~30s).",
      );
      return;
    }

    codeRef.current = null;
    sessionRef.current = null;
    setPendingCode(false);
    try {
      await customFetch("/api/meta/instagram/complete", {
        method: "POST",
        responseType: "json",
        body: JSON.stringify({ code, pageId, instagramAccountId }),
      });
      setConnected(true);
      setError(null);
      setPageIdHint(pageId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Instagram connection failed.");
    } finally {
      setConnecting(false);
    }
  }, [manualIgId, manualPageId]);

  useEffect(() => {
    if (!appId) return;
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v25.0",
      });
      setSdkReady(true);
    };

    if (window.FB) {
      window.fbAsyncInit();
      return;
    }
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(script);
    }
  }, [appId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      let originHost: string;
      try {
        originHost = new URL(event.origin).hostname;
      } catch {
        return;
      }
      if (originHost !== "facebook.com" && !originHost.endsWith(".facebook.com")) return;

      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const type = payload?.type as string | undefined;
        if (
          (type === "WA_EMBEDDED_SIGNUP" || type === "IG_EMBEDDED_SIGNUP" || type === "FB_LOGIN") &&
          typeof payload.event === "string" &&
          payload.event.startsWith("FINISH")
        ) {
          sessionRef.current = payload.data ?? null;
          void completeWhenReady();
        } else if (
          (type === "WA_EMBEDDED_SIGNUP" || type === "IG_EMBEDDED_SIGNUP") &&
          payload?.event === "CANCEL"
        ) {
          setConnecting(false);
        }
      } catch {
        // Ignore unrelated cross-window messages.
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [completeWhenReady]);

  const launch = () => {
    if (!window.FB || !configId) return;
    setConnecting(true);
    setError(null);
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setConnecting(false);
          setError("Meta sign-up was cancelled or did not return an authorization code.");
          return;
        }
        codeRef.current = code;
        void completeWhenReady();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      },
    );
  };

  if (!appId || !configId) {
    return (
      <p className="text-sm text-amber-700">
        Add VITE_META_APP_ID and VITE_META_IG_CONFIG_ID (or reuse VITE_META_CONFIG_ID) to enable Instagram connect.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border px-4 py-3 text-sm ${connected ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-muted/30 text-muted-foreground"}`}>
        {connected
          ? `Instagram Messaging is securely connected${pageIdHint ? ` (Page ${pageIdHint})` : ""}.`
          : "No Instagram Business account connected yet."}
      </div>
      {usingSharedConfig && (
        <p className="text-xs text-muted-foreground">
          Using VITE_META_CONFIG_ID because VITE_META_IG_CONFIG_ID is not set. Prefer a dedicated Instagram Embedded Signup config when available.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">Facebook Page ID</span>
          <input
            value={manualPageId}
            onChange={(e) => setManualPageId(e.target.value)}
            placeholder="Filled by signup or paste"
            className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Instagram Account ID</span>
          <input
            value={manualIgId}
            onChange={(e) => setManualIgId(e.target.value)}
            placeholder="Filled by signup or paste"
            className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        If Embedded Signup does not return Page / Instagram IDs, paste them above before connecting so the code exchange can finish within 30 seconds.
      </p>
      <button
        type="button"
        onClick={launch}
        disabled={!sdkReady || connecting}
        className="rounded-lg bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-5 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {connecting ? "Connecting…" : connected ? "Reconnect Instagram" : "Connect Instagram"}
      </button>
      {pendingCode && (
        <button
          type="button"
          onClick={() => {
            setConnecting(true);
            void completeWhenReady();
          }}
          disabled={connecting || !manualPageId.trim() || !manualIgId.trim()}
          className="ml-2 rounded-lg border border-border bg-background px-5 py-2.5 font-semibold disabled:opacity-50"
        >
          Finish connection
        </button>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
