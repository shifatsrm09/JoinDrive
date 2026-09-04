import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/auth-context";
import { GOOGLE_LOGIN_URL } from "../api/config";
import driveIcon from "../assets/icon/drive-icon.png";
import { openOAuthPopup } from "../utils/openOAuthPopup";

const ERROR_MESSAGES: Record<string, string> = {
  secondary_account:
    "This Google account is connected to JoinDrive as an extra Drive. Please continue with the account you originally signed up with.",
  session_expired: "Your session expired. Please sign in again.",
  login_failed: "Sign in failed. Please try again.",
  missing_code: "Sign in was cancelled.",
  invalid_state: "The sign in request expired or was invalid. Please try again.",
};

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, loading } = useAuth();

  const errorKey = searchParams.get("error");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!loading && user && !errorKey) {
      navigate("/explorer", { replace: true });
    }
  }, [loading, user, errorKey, navigate]);

  function handleLogin() {
    openOAuthPopup(GOOGLE_LOGIN_URL);
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#1b1b1b] text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#1b1b1b] px-4 py-8">
      <div className="w-full max-w-md text-center">
        <img
          src={driveIcon}
          alt=""
          className="mx-auto mb-4 h-16 w-16 object-contain"
        />

        <h1 className="mb-3 text-5xl font-bold text-white sm:text-6xl">
          JoinDrive
        </h1>

        <p className="mb-8 text-gray-400">
          All your Google Drives, in one place
        </p>

        {errorKey && (
          <div className="mx-auto mb-6 w-full break-words rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {ERROR_MESSAGES[errorKey] ||
              "Something went wrong. Please try again."}

            {email && (
              <span className="mt-1 block text-xs text-red-400/80">
                {email}
              </span>
            )}
          </div>
        )}

        <button
          onClick={handleLogin}
          className="min-h-11 rounded-lg bg-[#0E639C] px-8 py-3 font-medium text-white transition hover:bg-[#1177bb]"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
