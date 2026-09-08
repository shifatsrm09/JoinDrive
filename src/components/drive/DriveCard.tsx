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
import { formatStorage, getAccountStorage } from "../../utils/storage";

type DriveCardProps = {
  account: DriveAccount;
  onOpen: () => void;
  onRemoved?: () => void;
};

export default function DriveCard({
  account,
  onOpen,
  onRemoved,
}: DriveCardProps) {
  const { used, limit, percentage, personal } = getAccountStorage(account);
  const isStorageNearlyFull = percentage !== null && percentage >= 90;

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
      className="min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-[#252525] p-3 transition-all duration-200 hover:border-[#0E639C] hover:shadow-lg"
    >
      <div className="flex min-w-0 items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0E639C]/20 ${
              account.picture ? "overflow-hidden" : "p-2"
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
              <HardDrive className="text-[#4DA3FF]" size={20} />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white">
              <span className="min-w-0 truncate">{account.name}</span>

              {account.isPrimary && (
                <span
                  title="Primary account. JoinDrive is signed in with this one."
                  className="flex shrink-0 items-center gap-1 rounded-full bg-[#0E639C]/25 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#4DA3FF]"
                >
                  <Star size={9} />
                  Primary
                </span>
              )}
            </h2>

            <p className="truncate text-xs text-zinc-400">
              {account.email}
            </p>
          </div>
        </div>

        {!account.isPrimary && (
          <button
            ref={menuButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              openMenu();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition hover:bg-zinc-700 sm:h-auto sm:w-auto sm:p-1.5"
          >
            <MoreVertical size={16} />
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex flex-wrap justify-between gap-x-2 gap-y-1 text-xs">
          <span>{personal ? "Storage" : "Drive storage"}</span>

          <span className="text-zinc-300">
            {used === null ? "Unavailable" : limit === null
              ? `${formatStorage(used)} used`
              : `${formatStorage(used)} / ${formatStorage(limit)}`}
          </span>
        </div>

        {percentage !== null && <div className="h-1.5 overflow-hidden rounded-full bg-zinc-700">
          <div
            className={`h-full rounded-full transition-all ${
              isStorageNearlyFull ? "bg-[#b30000]" : "bg-[#0E639C]"
            }`}
            style={{
              width: `${Math.min(percentage, 100)}%`,
            }}
          />
        </div>}
        {!personal && <p className="mt-1.5 text-[11px] text-zinc-400">Drive files only. Individual storage limit unavailable.</p>}
      </div>

      <div
        className={`mt-2.5 flex items-center gap-1.5 text-xs ${
          account.connected ? "text-green-400" : "text-amber-400"
        }`}
      >
        {account.connected ? (
          <>
            <CheckCircle2 size={14} />
            Connected
          </>
        ) : (
          <>
            <AlertTriangle size={14} />
            Reconnect needed
          </>
        )}
      </div>

      {!account.isPrimary && menuPos && (
        <div onClick={(e) => e.stopPropagation()}>
          <ContextMenu
            x={menuPos.x}
            y={menuPos.y}
            items={menuItems}
            onClose={() => setMenuPos(null)}
          />
        </div>
      )}

      {!account.isPrimary && confirming && (
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title="Disconnect this Drive"
            message={
              error ||
              `"${account.email}" will be removed from JoinDrive. Your files stay in Google Drive untouched, and you can reconnect this account at any time.`
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
