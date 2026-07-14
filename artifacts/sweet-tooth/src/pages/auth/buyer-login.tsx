import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getGoogleRedirectUser, isFirebaseConfigured, onGoogleAuthUser, rememberGoogleUser, sendPhoneVerification, signInWithGoogle } from "@/lib/firebase-auth";
import type { ConfirmationResult } from "firebase/auth";

export default function BuyerLogin() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    let active = true;
    let completed = false;
    const completeLogin = (user: Awaited<ReturnType<typeof getGoogleRedirectUser>>) => {
      if (!active || !user || completed) return;
      completed = true;
      rememberGoogleUser(user, "buyer");
      navigate("/");
    };
    getGoogleRedirectUser()
      .then(completeLogin)
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "Google sign-in could not be completed."));
    const unsubscribe = onGoogleAuthUser(completeLogin);
    return () => { active = false; unsubscribe(); };
  }, [navigate]);

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      rememberGoogleUser(user, "buyer");
      navigate("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const normalized = phone.replace(/[\s()-]/g, "");
      if (!/^\+92\d{10}$/.test(normalized)) throw new Error("Use your number in this format: +923001234567.");
      setConfirmation(await sendPhoneVerification(normalized));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not send your verification code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!confirmation) return;
    setLoading(true);
    setError(null);
    try {
      const result = await confirmation.confirm(code.trim());
      rememberGoogleUser(result.user, "buyer");
      navigate("/");
    } catch {
      setError("That verification code is invalid or has expired. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 border border-border rounded-2xl bg-card shadow-lg text-center space-y-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Sweet Tooth</h1>
          <p className="text-muted-foreground">Ghar ka meetha.</p>
        </div>
        
        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp Number</label>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="+923001234567" className="w-full px-4 py-3 border border-border rounded-md bg-background" />
          </div>
          {confirmation && <input value={code} onChange={(event) => setCode(event.target.value)} type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit verification code" className="w-full px-4 py-3 border border-border rounded-md bg-background" />}
          <div id="firebase-phone-recaptcha" />
          <button onClick={confirmation ? verifyCode : sendCode} disabled={loading || !isFirebaseConfigured()} className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? "Please wait…" : confirmation ? "Verify & continue" : "Continue with phone"}
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <button onClick={loginWithGoogle} disabled={loading || !isFirebaseConfigured()} className="w-full border border-border py-3 rounded-md font-bold hover:bg-muted transition-colors disabled:opacity-50">
            {loading ? "Connecting Google..." : "Continue with Google"}
          </button>
          {!isFirebaseConfigured() && <p className="text-xs text-muted-foreground">Google sign-in will become available after Firebase is configured.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        
        <p className="text-sm text-muted-foreground">
          Are you a baker? <Link href="/dashboard/login" className="text-primary hover:underline">Go to Baker Portal</Link>
        </p>
      </div>
    </div>
  );
}
