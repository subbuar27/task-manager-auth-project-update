"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

type MeResponse = { user: User };
type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/api/auth/me"),
    retry: false,
    staleTime: 30_000,
  });

  const value: AuthContextValue = {
    user: me.data?.user ?? null,
    isLoading: me.isLoading,
    isAuthenticated: me.isSuccess,
    refreshUser: async () => {
      await me.refetch();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
