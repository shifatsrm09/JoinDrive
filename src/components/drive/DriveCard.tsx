import {
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  Star,
} from "lucide-react";

import type { DriveAccount } from "../../types/drive";

type DriveCardProps = {
  account: DriveAccount;
  onOpen: () => void;
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
}: DriveCardProps) {
  const used = toGb(account.storage?.usage);
  const total = toGb(account.storage?.limit);

  const percentage = total > 0 ? (used / total) * 100 : 0;

  return (
    <div
      onClick={onOpen}
      className="cursor-pointer rounded-2xl border border-zinc-800 bg-[#252525] p-5 transition-all duration-200 hover:border-[#0E639C] hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-xl bg-[#0E639C]/20 p-3">
            {account.picture ? (
              <img
                src={account.picture}
                alt=""
                className="h-6 w-6 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <HardDrive className="text-[#4DA3FF]" size={24} />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="flex items-center gap-2 truncate font-semibold text-white">
              {account.name}

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
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="shrink-0 rounded-lg p-2 transition hover:bg-zinc-700"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm">
          <span>Storage</span>

          <span className="text-zinc-300">
            {account.connected
              ? `${used} GB / ${total} GB`
              : "Unavailable"}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
          <div
            className="h-full rounded-full bg-[#0E639C] transition-all"
            style={{
              width: `${Math.min(percentage, 100)}%`,
            }}
          />
        </div>
      </div>

      <div
        className={`mt-5 flex items-center gap-2 text-sm ${
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
    </div>
  );
}
