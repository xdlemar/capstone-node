import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { auth, TOKEN_STORAGE_KEY, type DecodedUser } from "@/lib/auth";

export type AuthContextValue = {
  user: DecodedUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => auth.get());
  const [user, setUser] = useState<DecodedUser | null>(() => auth.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncFromStorage = () => {
      setToken(auth.get());
      setUser(auth.getUser());
      setLoading(false);
    };

    syncFromStorage();

    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== TOKEN_STORAGE_KEY) return;
      syncFromStorage();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = useCallback((newToken: string) => {
    auth.set(newToken);
    setToken(newToken);
    setUser(auth.getUser());
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    auth.clear();
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, loading, login, logout }),
    [token, user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
