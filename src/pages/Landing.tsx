import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/explorer", { replace: true });
    }
  }, [loading, user, navigate]);

  function handleLogin() {
    window.location.href = "http://localhost:5000/api/auth/google";
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1b1b1b] text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1b1b1b]">
      <div className="text-center">
        <h1 className="mb-3 text-6xl font-bold text-white">
          JoinDrive
        </h1>

        <p className="mb-8 text-gray-400">
          Windows Explorer for Google Drive
        </p>

        <button
          onClick={handleLogin}
          className="rounded-lg bg-blue-600 px-8 py-3 text-white transition hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}