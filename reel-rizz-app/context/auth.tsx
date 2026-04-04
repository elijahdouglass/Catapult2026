import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, getToken, setToken, removeToken } from '@/api/client';

export interface User {
  id: number;
  email: string;
  displayName: string;
  onboarded: boolean;
  igUsername?: string;
  igVerified?: boolean;
  worldIdVerified: boolean;
  tags?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  pendingVerifyCode: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, igUsername: string) => Promise<{ verifyCode: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerifyCode, setPendingVerifyCode] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const data = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      await removeToken();
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        await refreshUser();
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    await setToken(data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, displayName: string, igUsername: string) => {
    const data = await api.post<{ token: string; user: User; verifyCode: string }>('/auth/register', {
      email,
      password,
      displayName,
      igUsername,
    });
    await setToken(data.token);
    setUser(data.user);
    setPendingVerifyCode(data.verifyCode);
    return { verifyCode: data.verifyCode };
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, pendingVerifyCode, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
