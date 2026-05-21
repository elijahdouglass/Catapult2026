import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { api, setTokenGetter } from "../api/client";

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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
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

  // Make the api/client able to attach a fresh Clerk session token to every
  // outgoing request without a circular import.
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }
    refreshUser().finally(() => setLoading(false));
    // re-key on Clerk user id so a sign-out/sign-in re-fetches the local row
  }, [isLoaded, isSignedIn, clerkUser?.id, refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
