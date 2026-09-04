import { useAuth } from "../context/auth-context";

export function useCurrentUser() {
  const { user, loading } = useAuth();

  return {
    user,
    loading,
    account: user?.accounts?.[0] ?? null,
  };
}
