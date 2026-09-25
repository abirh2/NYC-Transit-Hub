import type { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  return children;
}

export function AuthButton() {
  return null;
}

export function AuthModal() {
  return null;
}

export function useAuth() {
  return {
    user: null,
    session: null,
    isLoading: false,
    signOut: async () => {},
    refreshSession: async () => {},
  };
}
