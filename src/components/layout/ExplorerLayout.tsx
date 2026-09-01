import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import Breadcrumb from "./Breadcrumb";

import FileGrid from "../file/FileGrid";
import ExplorerGrid from "../file/ExplorerGrid";

import type { DriveAccount } from "../../types/drive";

type HistoryEntry =
  | {
      type: "dashboard";
    }
  | {
      type: "folder";
      accountId: string;
      accountLabel: string;
      id: string;
      name: string;
    };

const CONNECT_MESSAGES: Record<string, string> = {
  success: "Google Drive connected",
  updated: "Google Drive reconnected",
};

const ERROR_MESSAGES: Record<string, string> = {
  already_linked:
    "That Google account is already connected to a different JoinDrive user.",
  invalid_state:
    "The connection request expired. Please try adding the Drive again.",
  connect_cancelled: "Adding the Google Drive was cancelled.",
  connect_failed: "Could not connect that Google Drive. Please try again.",
};

export default function ExplorerLayout() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [history, setHistory] = useState<HistoryEntry[]>([
    { type: "dashboard" },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const current = history[currentIndex];

  // The result of the "Add Google Drive" redirect is read straight from
  // the URL. Dismissing clears the query string.
  const connected = searchParams.get("connected");
  const connectError = searchParams.get("error");
  const connectedEmail = searchParams.get("email");

  const notice = connected
    ? [CONNECT_MESSAGES[connected] || "Google Drive connected", connectedEmail]
        .filter(Boolean)
        .join(": ")
    : connectError
    ? ERROR_MESSAGES[connectError] ||
      "Could not connect that Google Drive."
    : "";

  function dismissNotice() {
    setSearchParams({}, { replace: true });
  }

  function pushEntry(entry: HistoryEntry) {
    const newHistory = history.slice(0, currentIndex + 1);

    newHistory.push(entry);

    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }

  function openDrive(account: DriveAccount) {
    pushEntry({
      type: "folder",
      accountId: account.id,
      accountLabel: account.email,
      id: "root",
      name: account.email,
    });
  }

  function openFolder(id: string, name: string) {
    if (current.type !== "folder") {
      return;
    }

    // A folder always belongs to the drive that is currently open.
    pushEntry({
      type: "folder",
      accountId: current.accountId,
      accountLabel: current.accountLabel,
      id,
      name,
    });
  }

  function goBack() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function goForward() {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function navigateTo(index: number) {
    setCurrentIndex(index);
  }

  return (
    <div className="flex h-screen bg-[#1B1B1B] text-white">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Toolbar
          canGoBack={currentIndex > 0}
          canGoForward={currentIndex < history.length - 1}
          onBack={goBack}
          onForward={goForward}
        />

        <Breadcrumb
          history={history}
          currentIndex={currentIndex}
          onNavigate={navigateTo}
        />

        {notice && (
          <div
            className={`flex items-center justify-between px-6 py-3 text-sm ${
              connectError
                ? "bg-red-500/10 text-red-300"
                : "bg-green-500/10 text-green-300"
            }`}
          >
            <span>{notice}</span>

            <button
              onClick={dismissNotice}
              className="rounded px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {current.type === "dashboard" ? (
          <FileGrid onOpenDrive={openDrive} refreshKey={connected} />
        ) : (
          <ExplorerGrid
            accountId={current.accountId}
            folderId={current.id}
            onOpenFolder={openFolder}
          />
        )}
      </div>
    </div>
  );
}
