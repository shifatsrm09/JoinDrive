import { useAuth } from "../context/AuthContext";

export function useCurrentUser() {
  const { user, loading } = useAuth();

  return {
    user,
    loading,
    account: user?.accounts?.[0] ?? null,
  };
}