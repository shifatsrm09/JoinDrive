import { Plus } from "lucide-react";

import DriveCard from "../drive/DriveCard";
import useDriveAccounts from "../../hooks/useDriveAccounts";
import { useAuth } from "../../context/AuthContext";
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
    <main className="flex-1 overflow-auto bg-[#1B1B1B] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Connected Drives</h1>

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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
            className="flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700 bg-transparent p-5 text-zinc-400 transition-all duration-200 hover:border-[#0E639C] hover:text-[#4DA3FF]"
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
