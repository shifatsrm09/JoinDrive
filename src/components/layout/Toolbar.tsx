import {
  Menu,
  Search,
  Bell,
  CircleUser,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

export default function Toolbar() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
      navigate("/", { replace: true });
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-[#202020] px-6">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button className="rounded-lg p-2 transition hover:bg-zinc-700">
          <Menu size={22} />
        </button>

        <h1 className="text-xl font-semibold tracking-tight">
          JoinDrive
        </h1>
      </div>

      {/* Center */}
      <div className="hidden w-full max-w-xl px-10 md:flex">
        <div className="flex w-full items-center gap-3 rounded-xl bg-[#2B2B2B] px-4 py-2">
          <Search size={18} className="text-zinc-400" />

          <input
            type="text"
            placeholder="Search your drives..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button className="rounded-lg p-2 transition hover:bg-zinc-700">
          <Bell size={20} />
        </button>

        <button className="rounded-full p-1 transition hover:bg-zinc-700">
          <CircleUser size={32} />
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}