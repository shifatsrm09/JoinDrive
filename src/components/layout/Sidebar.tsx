import {
  House,
  HardDrive,
  Star,
  Clock3,
  Trash2,
  Plus,
} from "lucide-react";

import { GOOGLE_CONNECT_URL } from "../../api/config";
import { useAuth } from "../../context/AuthContext";

const menuItems = [
  { icon: House, label: "Home", active: true },
  { icon: HardDrive, label: "My Drives" },
  { icon: Star, label: "Favorites" },
  { icon: Clock3, label: "Recent" },
  { icon: Trash2, label: "Trash" },
];

type SidebarAccount = {
  _id: string;
  email: string;
  isPrimary?: boolean;
};

export default function Sidebar() {
  const { user } = useAuth();

  const accounts: SidebarAccount[] = user?.accounts ?? [];

  function handleAddDrive() {
    // Full page redirect: the backend starts the Google consent flow.
    window.location.href = GOOGLE_CONNECT_URL;
  }

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-800 bg-[#1F1F1F]">
      <div className="border-b border-zinc-800 p-5">
        <h2 className="text-lg font-semibold">Navigation</h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuItems.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-[#0E639C] text-white"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}

        <div className="mt-8">
          <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Connected Drives
          </div>

          {accounts.map((account) => (
            <div
              key={account._id}
              title={account.email}
              className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300"
            >
              <HardDrive size={18} className="shrink-0" />

              <span className="truncate">{account.email}</span>

              {account.isPrimary && (
                <Star
                  size={12}
                  className="ml-auto shrink-0 text-[#4DA3FF]"
                />
              )}
            </div>
          ))}

          <button
            onClick={handleAddDrive}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <Plus size={18} />
            Add Google Drive
          </button>
        </div>
      </nav>
    </aside>
  );
}
