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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">Connected Drives</h1>

        {!loading && accounts.length > 0 && (
          <span className="text-sm text-zinc-500">
            {accounts.length}{" "}
            {accounts.length === 1 ? "account" : "accounts"}
          </span>
        )}
      </div>

      {loading && (
        <p className="text-zinc-400">Loading drives...</p>
      )}

      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            className="flex min-h-40 flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-zinc-700 bg-transparent p-4 text-zinc-400 transition-all duration-200 hover:border-[#0E639C] hover:text-[#4DA3FF]"
          >
            <div className="rounded-xl bg-zinc-800 p-3">
              <Plus size={24} />
            </div>

            <span className="font-medium">Add Google Drive</span>

            <span className="max-w-[220px] text-center text-xs text-zinc-500">
              Connect another Google account to browse it here
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
