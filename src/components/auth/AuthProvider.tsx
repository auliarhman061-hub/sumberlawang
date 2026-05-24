"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}