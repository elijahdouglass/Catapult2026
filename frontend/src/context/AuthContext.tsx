import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api } from "../api/client";

interface User {
  id: number;
  email: string;
  displayName: string;
  onboarded: boolean;
  igUsername?: string;
  igVerified?: boolean;
  tags?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    igUsername: string
  ) => Promise<{ verifyCode: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await api.get<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>("/auth/login", {
      username,
      password,
    });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    igUsername: string
  ): Promise<{ verifyCode: string }> => {
    const data = await api.post<{
      token: string;
      verifyCode: string;
      user: User;
    }>("/auth/register", { email, password, displayName, igUsername });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return { verifyCode: data.verifyCode };
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
