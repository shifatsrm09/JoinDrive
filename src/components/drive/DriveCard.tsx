import { useRef, useState } from "react";
import {
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  Star,
  Unlink,
} from "lucide-react";

import ContextMenu from "../ui/ContextMenu";
import type { MenuItem } from "../ui/ContextMenu";
import ConfirmDialog from "../file/ConfirmDialog";

import { disconnectAccount } from "../../api/drive";
import type { DriveAccount } from "../../types/drive";

type DriveCardProps = {
  account: DriveAccount;
  onOpen: () => void;
  onRemoved?: () => void;
};

const GB = 1024 * 1024 * 1024;

function toGb(value?: string) {
  if (!value) {
    return 0;
  }

  return +(Number(value) / GB).toFixed(2);
}

export default function DriveCard({
  account,
  onOpen,
  onRemoved,
}: DriveCardProps) {
  const used = toGb(account.storage?.usage);
  const total = toGb(account.storage?.limit);

  const percentage = total > 0 ? (used / total) * 100 : 0;
  const isStorageNearlyFull = percentage >= 90;

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function openMenu() {
    const rect = menuButtonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setMenuPos({ x: rect.right - 200, y: rect.bottom + 6 });
  }

  const menuItems: MenuItem[] = [
    {
      kind: "item",
      label: "Disconnect Drive",
      icon: Unlink,
      danger: true,
      onSelect: () => setConfirming(true),
    },
  ];

  async function handleDisconnect() {
    try {
      setBusy(true);
      setError("");

      await disconnectAccount(account.id);

      setConfirming(false);
      onRemoved?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not disconnect this Drive"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onOpen}
      className="min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-[#252525] p-4 transition-all duration-200 hover:border-[#0E639C] hover:shadow-lg"
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0E639C]/20 ${
              account.picture ? "overflow-hidden" : "p-2.5"
            }`}
          >
            {account.picture ? (
              <img
                src={account.picture}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <HardDrive className="text-[#4DA3FF]" size={22} />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="flex min-w-0 items-center gap-2 font-semibold text-white">
              <span className="min-w-0 truncate">{account.name}</span>

              {account.isPrimary && (
                <span
                  title="Primary account. JoinDrive is signed in with this one."
                  className="flex shrink-0 items-center gap-1 rounded-full bg-[#0E639C]/25 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#4DA3FF]"
                >
                  <Star size={10} />
                  Primary
                </span>
              )}
            </h2>

            <p className="truncate text-sm text-zinc-400">
              {account.email}
            </p>
          </div>
        </div>

        <button
          ref={menuButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            openMenu();
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition hover:bg-zinc-700 sm:h-auto sm:w-auto sm:p-2"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
          <span>Storage</span>

          <span className="text-zinc-300">
            {account.connected
              ? `${used} GB / ${total} GB`
              : "Unavailable"}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
          <div
            className={`h-full rounded-full transition-all ${
              isStorageNearlyFull ? "bg-[#b30000]" : "bg-[#0E639C]"
            }`}
            style={{
              width: `${Math.min(percentage, 100)}%`,
            }}
          />
        </div>
      </div>

      <div
        className={`mt-4 flex items-center gap-2 text-sm ${
          account.connected ? "text-green-400" : "text-amber-400"
        }`}
      >
        {account.connected ? (
          <>
            <CheckCircle2 size={16} />
            Connected
          </>
        ) : (
          <>
            <AlertTriangle size={16} />
            Reconnect needed
          </>
        )}
      </div>

      {menuPos && (
        <div onClick={(e) => e.stopPropagation()}>
          <ContextMenu
            x={menuPos.x}
            y={menuPos.y}
            items={menuItems}
            onClose={() => setMenuPos(null)}
          />
        </div>
      )}

      {confirming && (
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title="Disconnect this Drive"
            message={
              error ||
              `"${account.email}" will be removed from JoinDrive. Your files stay in Google Drive untouched, and you can reconnect this account at any time.${
                account.isPrimary
                  ? " This is your primary account: you'll sign back in with a different connected Drive next time."
                  : ""
              }`
            }
            confirmLabel="Disconnect"
            danger
            busy={busy}
            onCancel={() => {
              setConfirming(false);
              setError("");
            }}
            onConfirm={handleDisconnect}
          />
        </div>
      )}
    </div>
  );
}
