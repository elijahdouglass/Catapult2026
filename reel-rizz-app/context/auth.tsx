import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { api, setTokenGetter } from '@/api/client';

export interface User {
  id: number;
  email: string;
  displayName: string;
  onboarded: boolean;
  igUsername?: string;
  igVerified?: boolean;
  igVerifyCode?: string;
  worldIdVerified: boolean;
  tags?: string;
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

// Clerk owns sign-in / sign-up / sign-out. This context just mirrors the
// local /me row for screens that still consume the old shape.
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>('/auth/me');
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
