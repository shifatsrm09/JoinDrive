import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  FileUp,
  FolderUp,
  House,
  HardDrive,
  Star,
  Clock3,
  Trash2,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { GOOGLE_CONNECT_URL } from "../../api/config";
import { useAuth } from "../../context/auth-context";
import useDriveAccounts from "../../hooks/useDriveAccounts";
import driveIcon from "../../assets/icon/drive-icon.png";
import { openOAuthPopup } from "../../utils/openOAuthPopup";

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
  onUploadFiles: () => void;
  onUploadFolder: () => void;
  onSelectRecent: () => void;
  onSelectFavorites: () => void;
  onSelectTrash: () => void;
  onSelectAccount: (accountId: string, email: string) => void;
  storageRefreshKey?: string;
  uploadsDisabled?: boolean;
};

const STORAGE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

function formatStorage(bytes: number) {
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < STORAGE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value)} ${STORAGE_UNITS[unit]}`;
}

export default function Sidebar({
  activeView,
  onNavigateHome,
  onUploadFiles,
  onUploadFolder,
  onSelectRecent,
  onSelectFavorites,
  onSelectTrash,
  onSelectAccount,
  storageRefreshKey,
  uploadsDisabled = false,
}: SidebarProps) {
  const { user } = useAuth();
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const [newMenu, setNewMenu] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  const accounts: SidebarAccount[] = user?.accounts ?? [];
  const accountVersion = accounts.map((account) => account._id).join("|");
  const {
    accounts: storageAccounts,
    loading: storageLoading,
    error: storageError,
  } = useDriveAccounts(`${storageRefreshKey || ""}:${accountVersion}`);
  const totalUsed = storageAccounts.reduce(
    (sum, account) => sum + Number(account.storage?.usage || 0),
    0
  );
  const totalLimit = storageAccounts.reduce(
    (sum, account) => sum + Number(account.storage?.limit || 0),
    0
  );
  const storagePercentage =
    totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
  const storageNearlyFull = storagePercentage >= 90;

  useEffect(() => {
    if (!newMenu) {
      return;
    }

    function closeIfOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !newButtonRef.current?.contains(target) &&
        !newMenuRef.current?.contains(target)
      ) {
        setNewMenu(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNewMenu(null);
      }
    }

    function closeOnResize() {
      setNewMenu(null);
    }

    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnResize);

    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [newMenu]);

  function toggleNewMenu() {
    if (newMenu) {
      setNewMenu(null);
      return;
    }

    const rect = newButtonRef.current?.getBoundingClientRect();

    if (rect) {
      const width = Math.min(rect.width, window.innerWidth - 16);

      setNewMenu({
        left: Math.max(
          8,
          Math.min(rect.left, window.innerWidth - width - 8)
        ),
        top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 110)),
        width,
      });
    }
  }

  function runNewAction(action: () => void) {
    setNewMenu(null);
    action();
  }

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
    openOAuthPopup(GOOGLE_CONNECT_URL);
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-800 bg-[#1F1F1F]">
      <button
        onClick={onNavigateHome}
        title="Go to home"
        className="flex h-16 shrink-0 items-center gap-2.5 border-b border-zinc-800 px-5 text-left transition hover:bg-zinc-800/60"
      >
        <img
          src={driveIcon}
          alt=""
          className="h-9 w-9 shrink-0 object-contain"
        />
        <span className="text-lg font-semibold tracking-tight text-white">
          JoinDrive
        </span>
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <button
          ref={newButtonRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={!!newMenu}
          disabled={uploadsDisabled}
          onClick={toggleNewMenu}
          className="mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-transparent px-3 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800/70 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:bg-transparent lg:min-h-0"
        >
          <Plus size={18} />
          New
        </button>

        {menuItems.map(({ icon: Icon, label, view, onSelect }) => (
          <button
            key={label}
            onClick={onSelect}
            className={`mb-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition lg:min-h-0 ${
              activeView === view
                ? view === "dashboard"
                  ? "bg-zinc-800/70 text-white ring-1 ring-inset ring-zinc-700/70"
                  : "bg-[#0E639C] text-white"
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
              className="mb-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-800 lg:min-h-0"
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
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 lg:min-h-0"
          >
            <Plus size={18} />
            Add Google Drive
          </button>
        </div>
      </nav>

      {newMenu &&
        createPortal(
          <div
            ref={newMenuRef}
            role="menu"
            style={{
              left: newMenu.left,
              top: newMenu.top,
              width: newMenu.width,
            }}
            className="fixed z-50 overflow-hidden rounded-lg border border-zinc-700 bg-[#292929] py-1 shadow-2xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => runNewAction(onUploadFiles)}
              className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-zinc-700/70 lg:min-h-0"
            >
              <FileUp size={17} />
              File upload
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => runNewAction(onUploadFolder)}
              className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-zinc-700/70 lg:min-h-0"
            >
              <FolderUp size={17} />
              Folder upload
            </button>
          </div>,
          document.body
        )}

      {accounts.length > 0 && (
        <div className="shrink-0 border-t border-zinc-800 px-4 py-4">
          {storageLoading ? (
            <div role="status" aria-label="Loading total storage" className="animate-pulse space-y-2.5">
              <div className="h-7 rounded-full bg-zinc-800" />
              <div className="h-1.5 rounded-full bg-zinc-800" />
              <div className="h-3 w-3/4 rounded bg-zinc-800" />
            </div>
          ) : totalLimit > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200">
                {storageNearlyFull && (
                  <AlertTriangle size={15} className="shrink-0 text-[#b30000]" />
                )}
                <span>Storage ({Math.round(storagePercentage)}% full)</span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-700">
                <div
                  className={`h-full rounded-full ${
                    storageNearlyFull ? "bg-[#b30000]" : "bg-[#0E639C]"
                  }`}
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>

              <p className="text-xs text-zinc-400">
                {formatStorage(totalUsed)} of {formatStorage(totalLimit)} used
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              {storageError || "Storage information unavailable"}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
