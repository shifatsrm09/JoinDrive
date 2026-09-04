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

type FolderPathSegment = { id: string; name: string };

type HistoryEntry =
  | { type: "dashboard" }
  | { type: "recent" }
  | { type: "starred" }
  | { type: "trash" }
  | {
      type: "folder";
      accountId: string;
      accountLabel: string;
      path: FolderPathSegment[];
    };

const CONNECT_MESSAGES: Record<string, string> = {
  success: "Google Drive connected",
  updated: "Google Drive reconnected",
  primary_reconnected: "This is already your primary account, its connection was refreshed",
};

const ERROR_MESSAGES: Record<string, string> = {
  already_linked:
    "That Google account is already connected to another JoinDrive account. First disconnect it there before connecting it here.",
  linked_as_primary_elsewhere:
    "That Google account is the primary account for a different JoinDrive account. Delete that JoinDrive account first to free it up.",
  invalid_state:
    "The connection request expired. Please try adding the Drive again.",
  connect_cancelled: "Adding the Google Drive was cancelled.",
  connect_failed: "Could not connect that Google Drive. Please try again.",
};

const MOUSE_BACK_BUTTON = 3;
const MOUSE_FORWARD_BUTTON = 4;

function entriesEqual(a: HistoryEntry, b: HistoryEntry) {
  if (a.type !== b.type) {
    return false;
  }

  if (a.type === "folder" && b.type === "folder") {
    return a.accountId === b.accountId && folderIdOf(a) === folderIdOf(b);
  }

  return true;
}

type NavState = { history: HistoryEntry[]; index: number };

function isNavState(value: unknown): value is NavState {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as NavState).history) &&
    typeof (value as NavState).index === "number"
  );
}

function folderIdOf(entry: Extract<HistoryEntry, { type: "folder" }>) {
  return entry.path.length ? entry.path[entry.path.length - 1].id : "root";
}

function folderNameOf(entry: Extract<HistoryEntry, { type: "folder" }>) {
  return entry.path.length
    ? entry.path[entry.path.length - 1].name
    : entry.accountLabel;
}

export default function ExplorerLayout() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [history, setHistory] = useState<HistoryEntry[]>([
    { type: "dashboard" },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const [uploadNonce, setUploadNonce] = useState(0);

  const [clipboard, setClipboard] = useState<Clipboard | null>(null);

  const current = history[currentIndex];

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  function goBack() {
    if (currentIndex > 0) {
      window.history.back();
    }
  }

  function goForward() {
    if (currentIndex < history.length - 1) {
      window.history.forward();
    }
  }

  useEffect(() => {
    const existing = window.history.state;

    if (isNavState(existing)) {
      setHistory(existing.history);
      setCurrentIndex(existing.index);
    } else {
      window.history.replaceState(
        { history: [{ type: "dashboard" }], index: 0 } satisfies NavState,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, []);

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      if (!isNavState(event.state)) {
        return;
      }

      const incoming = event.state;

      setHistory((prevHistory) =>
        incoming.history.length > prevHistory.length
          ? incoming.history
          : prevHistory
      );
      setCurrentIndex(incoming.index);
      setSearchQuery("");
    }

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

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
  }, [currentIndex, history.length]);

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

    window.history.replaceState(
      { history, index: currentIndex } satisfies NavState,
      "",
      window.location.pathname
    );
  }

  function pushEntry(entry: HistoryEntry) {
    const top = history[currentIndex];

    if (top && entriesEqual(top, entry)) {
      return;
    }

    const newHistory = history.slice(0, currentIndex + 1);

    newHistory.push(entry);

    const newIndex = newHistory.length - 1;

    window.history.pushState(
      { history: newHistory, index: newIndex } satisfies NavState,
      "",
      window.location.pathname + window.location.search
    );

    setHistory(newHistory);
    setCurrentIndex(newIndex);
    setSearchQuery("");
  }

  function openDrive(account: DriveAccount) {
    pushEntry({
      type: "folder",
      accountId: account.id,
      accountLabel: account.email,
      path: [],
    });
  }

  function openFolder(id: string, name: string) {
    if (current.type !== "folder") {
      return;
    }

    pushEntry({
      type: "folder",
      accountId: current.accountId,
      accountLabel: current.accountLabel,
      path: [...current.path, { id, name }],
    });
  }

  function openFolderIn(
    accountId: string,
    accountLabel: string,
    id: string,
    name: string
  ) {

    pushEntry({
      type: "folder",
      accountId,
      accountLabel,
      path: id === "root" ? [] : [{ id, name }],
    });
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

  function goHome() {
    pushEntry({ type: "dashboard" });
  }

  function goToFolderPath(
    accountId: string,
    accountLabel: string,
    path: FolderPathSegment[]
  ) {
    pushEntry({ type: "folder", accountId, accountLabel, path });
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
          onNavigateHome={goHome}
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
          current={current}
          onNavigateHome={goHome}
          onNavigateToFolder={goToFolderPath}
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
            key={`${current.accountId}-${folderIdOf(current)}-${uploadNonce}`}
            accountId={current.accountId}
            folderId={folderIdOf(current)}
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
                  folderId: folderIdOf(current),
                  folderName: folderNameOf(current),
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
