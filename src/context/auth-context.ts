import { createContext, useContext } from "react";

import type { MeResponse } from "../api/auth";

export type AuthUser = MeResponse["user"];

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
