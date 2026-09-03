import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

type RequireAuthProps = {
  children: ReactNode;
};

/**
 * Guards routes that need a signed in JoinDrive user (currently just
 * /explorer). Visiting a protected URL directly while logged out used
 * to render the page anyway, which just showed a broken empty
 * dashboard once every API call came back 401. This redirects to the
 * landing page instead, before any of that ever renders.
 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1b1b1b] text-white">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
