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
import type { UploadMode } from "../file/UploadDialog";
import { invalidateFolderContents } from "../../hooks/useFolderContents";

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

function getInitialNavigation(): NavState {
  const existing = window.history.state;

  return isNavState(existing)
    ? existing
    : { history: [{ type: "dashboard" }], index: 0 };
}

export default function ExplorerLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialNavigation] = useState(getInitialNavigation);

  const [history, setHistory] = useState<HistoryEntry[]>(
    initialNavigation.history
  );

  const [currentIndex, setCurrentIndex] = useState(initialNavigation.index);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    window.matchMedia("(min-width: 1024px)").matches
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [newAction, setNewAction] = useState<UploadMode | null>(null);

  const [uploadNonce, setUploadNonce] = useState(0);

  const [clipboard, setClipboard] = useState<Clipboard | null>(null);

  const current = history[currentIndex];

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    function handleBreakpointChange(event: MediaQueryListEvent) {
      setSidebarOpen(event.matches);
    }

    desktopQuery.addEventListener("change", handleBreakpointChange);

    return () => {
      desktopQuery.removeEventListener("change", handleBreakpointChange);
    };
  }, []);

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
    if (!isNavState(window.history.state)) {
      window.history.replaceState(
        initialNavigation,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, [initialNavigation]);

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
        if (currentIndex > 0) {
          window.history.back();
        }
      } else if (event.button === MOUSE_FORWARD_BUTTON) {
        event.preventDefault();
        if (currentIndex < history.length - 1) {
          window.history.forward();
        }
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

  function handleUploaded(accountId: string, folderId: string) {
    invalidateFolderContents(accountId, folderId);
    setUploadNonce((n) => n + 1);
  }

  function goHome() {
    pushEntry({ type: "dashboard" });
  }

  function runSidebarAction(action: () => void) {
    action();

    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarOpen(false);
    }
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
    <div className="flex h-dvh min-w-0 overflow-hidden bg-[#1B1B1B] text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-hidden transition-transform duration-200 lg:relative lg:z-auto lg:transition-[width] ${
          sidebarOpen
            ? "translate-x-0 lg:w-64"
            : "-translate-x-full lg:w-0 lg:translate-x-0"
        }`}
      >
        <Sidebar
          activeView={sidebarActiveView}
          onNavigateHome={() => runSidebarAction(goHome)}
          onUploadFiles={() =>
            runSidebarAction(() => setNewAction("files"))
          }
          onUploadFolder={() =>
            runSidebarAction(() => setNewAction("folder"))
          }
          onSelectRecent={() =>
            runSidebarAction(() => pushEntry({ type: "recent" }))
          }
          onSelectFavorites={() =>
            runSidebarAction(() => pushEntry({ type: "starred" }))
          }
          onSelectTrash={() =>
            runSidebarAction(() => pushEntry({ type: "trash" }))
          }
          onSelectAccount={(accountId, email) =>
            runSidebarAction(() =>
              openFolderIn(accountId, email, "root", email)
            )
          }
          storageRefreshKey={`${connected || ""}:${uploadNonce}`}
          uploadsDisabled={newAction !== null}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
            className={`flex shrink-0 items-start justify-between gap-3 px-4 py-3 text-sm sm:items-center sm:px-6 ${
              connectError
                ? "bg-red-500/10 text-red-300"
                : "bg-green-500/10 text-green-300"
            }`}
          >
            <span className="min-w-0 break-words">{notice}</span>

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

      {newAction && (
        <UploadDialog
          mode={newAction}
          onClose={() => setNewAction(null)}
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
