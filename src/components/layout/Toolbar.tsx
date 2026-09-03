import { useRef, useState } from "react";
import {
  Menu,
  Search,
  X,
  CircleUser,
  LogOut,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout, deleteAccount } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import ContextMenu from "../ui/ContextMenu";
import type { MenuItem } from "../ui/ContextMenu";
import ConfirmDialog from "../file/ConfirmDialog";

type ToolbarProps = {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

export default function Toolbar({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onToggleSidebar,
  searchQuery,
  onSearchChange,
}: ToolbarProps) {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const [profileMenu, setProfileMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const accounts = user?.accounts ?? [];

  const primaryAccount =
    accounts.find((account) => account.isPrimary) ?? accounts[0] ?? null;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
      navigate("/", { replace: true });
    }
  }

  async function handleDeleteAccount() {
    try {
      setDeleteBusy(true);
      setDeleteError("");

      await deleteAccount();

      setUser(null);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete this account"
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  function openProfileMenu() {
    const rect = profileButtonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setProfileMenu({ x: rect.right - 240, y: rect.bottom + 8 });
  }

  const profileItems: MenuItem[] = [
    {
      kind: "item",
      label: primaryAccount?.email || "Signed in",
      icon: CircleUser,
      disabled: true,
      onSelect: () => {},
    },
    { kind: "separator" },
    {
      kind: "item",
      label: "Log out",
      icon: LogOut,
      onSelect: handleLogout,
    },
    {
      kind: "item",
      label: "Delete JoinDrive account",
      icon: UserX,
      danger: true,
      onSelect: () => {
        setDeleteError("");
        setConfirmingDelete(true);
      },
    },
  ];

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-[#202020] px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          title="Toggle sidebar"
          className="rounded-lg p-2 transition hover:bg-zinc-700"
        >
          <Menu size={22} />
        </button>

        <button
          onClick={onBack}
          disabled={!canGoBack}
          title="Back"
          className={`rounded-lg p-2 transition ${
            canGoBack ? "hover:bg-zinc-700" : "cursor-not-allowed opacity-40"
          }`}
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={onForward}
          disabled={!canGoForward}
          title="Forward"
          className={`rounded-lg p-2 transition ${
            canGoForward
              ? "hover:bg-zinc-700"
              : "cursor-not-allowed opacity-40"
          }`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="hidden w-full max-w-xl px-10 md:flex">
        <div className="flex w-full items-center gap-3 rounded-xl bg-[#2B2B2B] px-4 py-2 focus-within:ring-1 focus-within:ring-[#0E639C]">
          <Search size={18} className="shrink-0 text-zinc-400" />

          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search your drives..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
          />

          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              title="Clear search"
              className="shrink-0 rounded p-0.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          ref={profileButtonRef}
          onClick={openProfileMenu}
          title={primaryAccount?.email || "Account"}
          className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-zinc-700"
        >
          {primaryAccount?.picture ? (
            <img
              src={primaryAccount.picture}
              alt=""
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full ring-1 ring-zinc-600"
            />
          ) : (
            <CircleUser size={32} />
          )}
        </button>
      </div>

      {profileMenu && (
        <ContextMenu
          x={profileMenu.x}
          y={profileMenu.y}
          items={profileItems}
          onClose={() => setProfileMenu(null)}
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete JoinDrive account"
          message={
            deleteError ||
            `This permanently deletes your JoinDrive account and disconnects all ${accounts.length} linked Google Drive${
              accounts.length === 1 ? "" : "s"
            } (${accounts
              .map((account) => account.email)
              .join(
                ", "
              )}). Your files stay untouched in Google Drive, but every one of these accounts becomes free to sign up or connect elsewhere. This cannot be undone.`
          }
          confirmLabel="Delete account"
          danger
          busy={deleteBusy}
          onCancel={() => {
            setConfirmingDelete(false);
            setDeleteError("");
          }}
          onConfirm={handleDeleteAccount}
        />
      )}
    </header>
  );
}
