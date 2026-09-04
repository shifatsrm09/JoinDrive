import { useEffect, useState } from "react";

import type { ReactNode } from "react";

import { getMe } from "../api/auth";
import { AuthContext } from "./auth-context";
import type { AuthUser } from "./auth-context";

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const data = await getMe();

      if (data.success) {
        setUser(data.user);
      }
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    void getMe()
      .then((data) => {
        if (active && data.success) {
          setUser(data.user);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
