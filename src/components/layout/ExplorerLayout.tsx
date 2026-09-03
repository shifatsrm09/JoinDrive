import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Sidebar from "./Sidebar";
import type { SidebarView } from "./Sidebar";
import Toolbar from "./Toolbar";
import Breadcrumb from "./Breadcrumb";

import FileGrid from "../file/FileGrid";
import ExplorerGrid from "../file/ExplorerGrid";
import AggregateGrid from "../file/AggregateGrid";
import UploadDialog from "../file/UploadDialog";

import type { Clipboard, DriveAccount } from "../../types/drive";

type HistoryEntry =
  | { type: "dashboard" }
  | { type: "recent" }
  | { type: "starred" }
  | { type: "trash" }
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

// Browsers report the mouse side buttons ("back"/"forward" thumb
// buttons) as button 3 and 4 on mouse events. There is no dedicated
// DOM event for them, so a raw mouseup listener is the standard way
// to detect the gesture.
const MOUSE_BACK_BUTTON = 3;
const MOUSE_FORWARD_BUTTON = 4;

export default function ExplorerLayout() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [history, setHistory] = useState<HistoryEntry[]>([
    { type: "dashboard" },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  // Bumped after every completed upload so the destination folder's
  // ExplorerGrid remounts and refetches, even when it was already open.
  const [uploadNonce, setUploadNonce] = useState(0);

  // The clipboard lives here so a copied file survives folder
  // navigation and can be pasted somewhere else in the drive.
  const [clipboard, setClipboard] = useState<Clipboard | null>(null);

  const current = history[currentIndex];

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  function goBack() {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }

  function goForward() {
    setCurrentIndex((prev) => Math.min(history.length - 1, prev + 1));
  }

  // Mouse side buttons act like a browser's back/forward, scoped to
  // in-app folder navigation instead of leaving the page.
  useEffect(() => {
    function onMouseUp(event: MouseEvent) {
      if (event.button === MOUSE_BACK_BUTTON) {
        event.preventDefault();
        goBack();
      } else if (event.button === MOUSE_FORWARD_BUTTON) {
        event.preventDefault();
        goForward();
      }
    }

    // Some browsers fire the navigation on mousedown; preventDefault
    // there too so the tab itself never navigates away.
    function onMouseDown(event: MouseEvent) {
      if (
        event.button === MOUSE_BACK_BUTTON ||
        event.button === MOUSE_FORWARD_BUTTON
      ) {
        event.preventDefault();
      }
    }

    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousedown", onMouseDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length]);

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
    ? ERROR_MESSAGES[connectError] || "Could not connect that Google Drive."
    : "";

  function dismissNotice() {
    setSearchParams({}, { replace: true });
  }

  function pushEntry(entry: HistoryEntry) {
    const newHistory = history.slice(0, currentIndex + 1);

    newHistory.push(entry);

    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
    setSearchQuery("");
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

  function openFolderIn(
    accountId: string,
    accountLabel: string,
    id: string,
    name: string
  ) {
    pushEntry({ type: "folder", accountId, accountLabel, id, name });
  }

  function handleUploaded(
    accountId: string,
    accountLabel: string,
    folderId: string,
    folderName: string
  ) {
    setUploadNonce((n) => n + 1);
    openFolderIn(accountId, accountLabel, folderId, folderName);
  }

  function navigateTo(index: number) {
    setCurrentIndex(index);
  }

  const sidebarActiveView: SidebarView =
    current.type === "folder" ? "folder" : current.type;

  return (
    <div className="flex h-screen bg-[#1B1B1B] text-white">
      <div
        className={`overflow-hidden transition-[width] duration-200 ${
          sidebarOpen ? "w-64" : "w-0"
        }`}
      >
        <Sidebar
          activeView={sidebarActiveView}
          onNavigateHome={() => pushEntry({ type: "dashboard" })}
          onUpload={() => setShowUpload(true)}
          onSelectRecent={() => pushEntry({ type: "recent" })}
          onSelectFavorites={() => pushEntry({ type: "starred" })}
          onSelectTrash={() => pushEntry({ type: "trash" })}
          onSelectAccount={(accountId, email) =>
            openFolderIn(accountId, email, "root", email)
          }
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Toolbar
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onBack={goBack}
          onForward={goForward}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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

        {searchQuery.trim() ? (
          <AggregateGrid
            mode="search"
            query={searchQuery}
            onOpenFolder={openFolderIn}
          />
        ) : current.type === "dashboard" ? (
          <FileGrid onOpenDrive={openDrive} refreshKey={connected} />
        ) : current.type === "folder" ? (
          <ExplorerGrid
            key={`${current.accountId}-${current.id}-${uploadNonce}`}
            accountId={current.accountId}
            folderId={current.id}
            clipboard={clipboard}
            onClipboardChange={setClipboard}
            onOpenFolder={openFolder}
          />
        ) : (
          <AggregateGrid mode={current.type} onOpenFolder={openFolderIn} />
        )}
      </div>

      {showUpload && (
        <UploadDialog
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
          initialLocation={
            current.type === "folder"
              ? {
                  accountId: current.accountId,
                  accountLabel: current.accountLabel,
                  folderId: current.id,
                  folderName: current.name,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
