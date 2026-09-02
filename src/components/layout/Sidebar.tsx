import {
  House,
  HardDrive,
  Star,
  Clock3,
  Trash2,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { GOOGLE_CONNECT_URL } from "../../api/config";
import { useAuth } from "../../context/AuthContext";

export type SidebarView =
  | "dashboard"
  | "folder"
  | "recent"
  | "starred"
  | "trash";

type SidebarAccount = {
  _id: string;
  email: string;
  isPrimary?: boolean;
};

type SidebarProps = {
  activeView: SidebarView;
  onNavigateHome: () => void;
  onSelectRecent: () => void;
  onSelectFavorites: () => void;
  onSelectTrash: () => void;
  onSelectAccount: (accountId: string, email: string) => void;
};

export default function Sidebar({
  activeView,
  onNavigateHome,
  onSelectRecent,
  onSelectFavorites,
  onSelectTrash,
  onSelectAccount,
}: SidebarProps) {
  const { user } = useAuth();

  const accounts: SidebarAccount[] = user?.accounts ?? [];

  const menuItems: {
    icon: LucideIcon;
    label: string;
    view: SidebarView;
    onSelect: () => void;
  }[] = [
    { icon: House, label: "Home", view: "dashboard", onSelect: onNavigateHome },
    {
      icon: Star,
      label: "Favorites",
      view: "starred",
      onSelect: onSelectFavorites,
    },
    { icon: Clock3, label: "Recent", view: "recent", onSelect: onSelectRecent },
    { icon: Trash2, label: "Trash", view: "trash", onSelect: onSelectTrash },
  ];

  function handleAddDrive() {
    // Full page redirect: the backend starts the Google consent flow.
    window.location.href = GOOGLE_CONNECT_URL;
  }

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-800 bg-[#1F1F1F]">
      <button
        onClick={onNavigateHome}
        title="Go to home"
        className="flex items-center gap-2.5 border-b border-zinc-800 p-5 text-left transition hover:bg-zinc-800/60"
      >
        <img src="/favicon.svg" alt="" className="h-7 w-7 shrink-0" />
        <span className="text-lg font-semibold tracking-tight text-white">
          JoinDrive
        </span>
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuItems.map(({ icon: Icon, label, view, onSelect }) => (
          <button
            key={label}
            onClick={onSelect}
            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              activeView === view
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
            <button
              key={account._id}
              title={account.email}
              onClick={() => onSelectAccount(account._id, account.email)}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              <HardDrive size={18} className="shrink-0" />

              <span className="truncate">{account.email}</span>

              {account.isPrimary && (
                <Star
                  size={12}
                  className="ml-auto shrink-0 text-[#4DA3FF]"
                />
              )}
            </button>
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
