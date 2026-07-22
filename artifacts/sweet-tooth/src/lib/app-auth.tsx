import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/react";

type AppAuthValue = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  getToken: (options?: { template?: string }) => Promise<string | null>;
};

const AppAuthContext = createContext<AppAuthValue | null>(null);

const STUB_AUTH: AppAuthValue = {
  isLoaded: true,
  isSignedIn: false,
  getToken: async () => null,
};

export function isClerkConfigured(): boolean {
  const key = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim();
  return Boolean(key && /^pk_(test|live)_/.test(key));
}

function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const value: AppAuthValue = {
    isLoaded,
    isSignedIn,
    getToken: async (options) => (await getToken(options)) ?? null,
  };
  return (
    <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
  );
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  if (!isClerkConfigured()) {
    return (
      <AppAuthContext.Provider value={STUB_AUTH}>{children}</AppAuthContext.Provider>
    );
  }

  const publishableKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string).trim();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/dashboard/login"
      signUpUrl="/dashboard/register"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard/onboarding"
      afterSignOutUrl="/dashboard/login"
    >
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}

export function useAppAuth(): AppAuthValue {
  const value = useContext(AppAuthContext);
  if (!value) {
    throw new Error("useAppAuth must be used within AppAuthProvider");
  }
  return value;
}
