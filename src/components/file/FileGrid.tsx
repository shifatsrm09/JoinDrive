import { Plus } from "lucide-react";

import DriveCard from "../drive/DriveCard";
import useDriveAccounts from "../../hooks/useDriveAccounts";
import { useAuth } from "../../context/auth-context";
import { GOOGLE_CONNECT_URL } from "../../api/config";
import type { DriveAccount } from "../../types/drive";
import { openOAuthPopup } from "../../utils/openOAuthPopup";

type FileGridProps = {
  onOpenDrive: (account: DriveAccount) => void;
  refreshKey?: string | null;
};

const DRIVE_SKELETON_ITEMS = Array.from({ length: 8 }, (_, index) => index);

function DriveCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl border border-zinc-800 bg-[#252525] p-3"
    >
      <div className="flex items-start gap-2">
        <div className="h-9 w-9 shrink-0 rounded-lg bg-zinc-700/70" />

        <div className="min-w-0 flex-1 space-y-2 py-0.5">
          <div className="h-3.5 w-2/3 rounded bg-zinc-700/70" />
          <div className="h-3 w-5/6 rounded bg-zinc-800" />
        </div>

        <div className="h-7 w-7 shrink-0 rounded-lg bg-zinc-800" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="h-3 w-12 rounded bg-zinc-800" />
        <div className="h-3 w-24 rounded bg-zinc-700/70" />
      </div>

      <div className="mt-1.5 h-1.5 rounded-full bg-zinc-700/70" />

      <div className="mt-2.5 flex items-center gap-1.5">
        <div className="h-3.5 w-3.5 rounded-full bg-zinc-700/70" />
        <div className="h-3 w-16 rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export default function FileGrid({
  onOpenDrive,
  refreshKey,
}: FileGridProps) {
  const { accounts, loading, error, reload } = useDriveAccounts(refreshKey);
  const { refreshUser } = useAuth();

  function handleAddDrive() {
    openOAuthPopup(GOOGLE_CONNECT_URL);
  }

  function handleRemoved() {
    reload();
    refreshUser();
  }

  return (
    <main className="min-w-0 flex-1 overflow-auto bg-[#1B1B1B] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">Connected Drives</h1>

        {!loading && accounts.length > 0 && (
          <span className="text-sm text-zinc-500">
            {accounts.length}{" "}
            {accounts.length === 1 ? "account" : "accounts"}
          </span>
        )}
      </div>

      {loading && (
        <div role="status" aria-label="Loading connected drives">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {DRIVE_SKELETON_ITEMS.map((item) => (
              <DriveCardSkeleton key={item} />
            ))}
          </div>
          <span className="sr-only">Loading connected drives...</span>
        </div>
      )}

      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {accounts.map((account) => (
            <DriveCard
              key={account.id}
              account={account}
              onOpen={() => onOpenDrive(account)}
              onRemoved={handleRemoved}
            />
          ))}

          <button
            onClick={handleAddDrive}
            className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 bg-transparent p-3 text-zinc-400 transition-all duration-200 hover:border-[#0E639C] hover:text-[#4DA3FF]"
          >
            <div className="rounded-lg bg-zinc-800 p-2">
              <Plus size={20} />
            </div>

            <span className="text-sm font-medium">Add Google Drive</span>

            <span className="max-w-[190px] text-center text-[11px] text-zinc-500">
              Connect another Google account to browse it here
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
