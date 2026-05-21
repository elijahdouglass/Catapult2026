import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { api, ApiError, setTokenGetter } from "../api/client";

interface User {
  id: number;
  email: string;
  displayName: string;
  onboarded: boolean;
  igUsername?: string;
  igVerified?: boolean;
  igVerifyCode?: string;
  tags?: string;
  worldIdVerified: boolean;
}

// Permanent (operator-action-required) failures surfaced by /auth/me, parsed
// from the backend's structured 409 body. Today the only such code is
// `email_conflict` (from `authMiddleware.EmailLinkedElsewhereError`), but the
// shape leaves room for future ones.
export interface AuthError {
  code: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: AuthError | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  refreshUser: async () => {},
});

// Bridges Clerk's session into the legacy AuthContext shape the rest of the
// app already consumes. Clerk owns sign-in / sign-up / sign-out — those
// actions are now performed via Clerk's components and hooks directly,
// not through this context.
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  // Clean up the legacy JWT key from before the Clerk switch. Harmless if
  // absent; just stops a stale value from sitting in storage forever.
  useEffect(() => {
    try {
      localStorage.removeItem("token");
    } catch {
      // localStorage may be unavailable in private-browsing contexts.
    }
  }, []);

  // Make the api/client able to attach a fresh Clerk session token to every
  // outgoing request without a circular import.
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>("/auth/me");
      setUser(data.user);
      setAuthError(null);
    } catch (err) {
      // Distinguish permanent identity collisions from transient failures. A
      // 409 with `code: "email_conflict"` means this Clerk user's email is
      // already linked to a different local row — every subsequent /auth/me
      // call returns the same 409, so signing in again won't help. Surface a
      // dedicated error state so the consumer can render an actionable
      // screen (with sign-out) instead of dropping the user into the
      // signed-in-but-no-local-user UX, which is itself a dead end.
      if (err instanceof ApiError && err.code === "email_conflict") {
        setAuthError({ code: err.code, message: err.message });
      } else {
        setAuthError(null);
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUser(null);
      setAuthError(null);
      setLoading(false);
      return;
    }
    refreshUser().finally(() => setLoading(false));
    // re-key on Clerk user id so a sign-out/sign-in re-fetches the local row
  }, [isLoaded, isSignedIn, clerkUser?.id, refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, authError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
