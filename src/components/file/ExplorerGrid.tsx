import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  FolderPlus,
  Image,
  LayoutGrid,
  List,
  Music,
  MoreVertical,
  Pencil,
  RefreshCw,
  Scissors,
  Share2,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";

import ContextMenu from "../ui/ContextMenu";
import type { MenuItem } from "../ui/ContextMenu";
import RenameDialog from "./RenameDialog";
import NewFolderDialog from "./NewFolderDialog";
import ConfirmDialog from "./ConfirmDialog";
import ShareDialog from "./ShareDialog";

import {
  copyFile,
  createFolder,
  deleteFile,
  downloadUrl,
  moveFile,
  renameFile,
  setStarred,
} from "../../api/drive";

import { isFolder } from "../../types/drive";
import type {
  Clipboard,
  DriveFile,
  SortDirection,
  SortKey,
} from "../../types/drive";
import useFolderContents from "../../hooks/useFolderContents";

type ExplorerGridProps = {
  accountId: string;
  folderId: string;
  clipboard: Clipboard | null;
  onClipboardChange: (clipboard: Clipboard | null) => void;
  onOpenFolder: (id: string, name: string) => void;
};

type MenuState = {
  x: number;
  y: number;
  file: DriveFile | null;
};

type DialogState =
  | { kind: "rename"; file: DriveFile }
  | { kind: "delete"; file: DriveFile }
  | { kind: "share"; file: DriveFile }
  | { kind: "newFolder" }
  | null;

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  modified: "Modified",
  size: "Size",
};

type ViewMode = "grid" | "list";

const VIEW_MODE_KEY = "joindrive:viewMode";

function loadViewMode(): ViewMode {
  if (typeof window === "undefined") {
    return "grid";
  }

  return window.localStorage.getItem(VIEW_MODE_KEY) === "list"
    ? "list"
    : "grid";
}

function getIcon(file: DriveFile, size = 44) {
  const type = file.mimeType;

  if (isFolder(file)) {
    return <Folder size={size} className="text-blue-400" />;
  }

  if (type.startsWith("image/")) {
    return <Image size={size} className="text-green-400" />;
  }

  if (type.startsWith("video/")) {
    return <FileVideo size={size} className="text-purple-400" />;
  }

  if (type.startsWith("audio/")) {
    return <Music size={size} className="text-pink-400" />;
  }

  if (type.includes("spreadsheet") || type.includes("excel")) {
    return <FileSpreadsheet size={size} className="text-emerald-400" />;
  }

  if (type.includes("zip") || type.includes("rar") || type.includes("tar")) {
    return <FileArchive size={size} className="text-yellow-400" />;
  }

  if (
    type.includes("document") ||
    type.includes("text") ||
    type.includes("pdf")
  ) {
    return <FileText size={size} className="text-zinc-300" />;
  }

  return <FileIcon size={size} className="text-zinc-400" />;
}

function formatSize(size?: string) {
  if (!size) {
    return "";
  }

  const bytes = Number(size);
  const units = ["B", "KB", "MB", "GB", "TB"];

  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${
    units[unit]
  }`;
}

function ownerLabel(file: DriveFile) {
  const owner = file.owners?.[0];

  if (!owner) {
    return "—";
  }

  if (owner.emailAddress?.includes("@")) {
    return owner.emailAddress.split("@")[0];
  }

  return owner.displayName || owner.emailAddress || "—";
}

const EXPLORER_SKELETON_ITEMS = Array.from(
  { length: 10 },
  (_, index) => index
);

function ExplorerLoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  return (
    <main
      role="status"
      aria-label="Loading files"
      className="relative min-w-0 flex-1 overflow-auto bg-[#1B1B1B] p-4 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="mb-5 flex animate-pulse flex-wrap items-center gap-2"
      >
        <div className="h-3 w-12 rounded bg-zinc-800" />
        <div className="h-8 w-16 rounded-lg bg-zinc-800" />
        <div className="h-8 w-20 rounded-lg bg-zinc-800" />
        <div className="h-8 w-14 rounded-lg bg-zinc-800" />
        <div className="h-8 w-8 rounded-lg bg-zinc-800" />
        <div className="ml-auto h-8 w-8 rounded-lg bg-zinc-800" />
        <div className="h-8 w-16 rounded-lg bg-zinc-800" />
      </div>

      {viewMode === "list" ? (
        <div
          aria-hidden="true"
          className="min-w-0 animate-pulse overflow-hidden rounded-xl border border-zinc-800"
        >
          <div className="flex h-9 items-center gap-3 border-b border-zinc-800 bg-[#202020] px-3 sm:gap-4 sm:px-4">
            <div className="h-3 w-9 shrink-0 rounded bg-zinc-800" />
            <div className="h-3 w-24 rounded bg-zinc-700/70" />
            <div className="ml-auto hidden h-3 w-20 rounded bg-zinc-800 sm:block" />
            <div className="hidden h-3 w-28 rounded bg-zinc-800 sm:block" />
            <div className="hidden h-3 w-14 rounded bg-zinc-800 sm:block" />
          </div>

          {EXPLORER_SKELETON_ITEMS.slice(0, 8).map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 border-b border-zinc-800/60 bg-[#252525] px-3 py-2.5 last:border-b-0 sm:gap-4 sm:px-4"
            >
              <div className="flex w-9 shrink-0 justify-center">
                <div className="h-5 w-5 rounded bg-zinc-700/70" />
              </div>
              <div className="h-3.5 min-w-0 flex-1 rounded bg-zinc-700/70" />
              <div className="hidden h-3 w-28 shrink-0 rounded bg-zinc-800 sm:block" />
              <div className="hidden h-3 w-40 shrink-0 rounded bg-zinc-800 sm:block" />
              <div className="hidden h-3 w-20 shrink-0 rounded bg-zinc-800 sm:block" />
              <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-800 lg:hidden" />
            </div>
          ))}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="grid min-w-0 animate-pulse gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5"
        >
          {EXPLORER_SKELETON_ITEMS.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-zinc-800 bg-[#252525] p-4 sm:p-5"
            >
              <div className="mx-auto mb-4 h-11 w-11 rounded-lg bg-zinc-700/70" />
              <div className="mx-auto h-3.5 w-3/4 rounded bg-zinc-700/70" />
              <div className="mx-auto mt-2 h-3 w-1/2 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      )}

      <span className="sr-only">Loading files...</span>
    </main>
  );
}

export default function ExplorerGrid({
  accountId,
  folderId,
  clipboard,
  onClipboardChange,
  onOpenFolder,
}: ExplorerGridProps) {
  const {
    files,
    setFiles,
    loading,
    loadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    reload,
  } = useFolderContents(accountId, folderId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [toastIsError, setToastIsError] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  const notify = useCallback((message: string, isError = false) => {
    setToast(message);
    setToastIsError(isError);

    window.setTimeout(() => setToast(""), 4000);
  }, []);

  const sorted = useMemo(() => {
    const factor = sortDirection === "asc" ? 1 : -1;

    return [...files].sort((a, b) => {
      const folderDelta = Number(isFolder(b)) - Number(isFolder(a));

      if (folderDelta !== 0) {
        return folderDelta;
      }

      if (sortKey === "modified") {
        return (
          factor *
          (new Date(a.modifiedTime).getTime() -
            new Date(b.modifiedTime).getTime())
        );
      }

      if (sortKey === "size") {
        return factor * (Number(a.size || 0) - Number(b.size || 0));
      }

      return (
        factor *
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    });
  }, [files, sortKey, sortDirection]);

  const selected = useMemo(
    () => sorted.find((file) => file.id === selectedId) || null,
    [sorted, selectedId]
  );

  const canPaste =
    !!clipboard && clipboard.accountId === accountId && !busy;

  const openItem = useCallback(
    (file: DriveFile) => {
      if (isFolder(file)) {
        onOpenFolder(file.id, file.name);
        return;
      }

      if (file.webViewLink) {
        window.open(file.webViewLink, "_blank", "noopener,noreferrer");
      }
    },
    [onOpenFolder]
  );

  const download = useCallback(
    (file: DriveFile) => {
      if (isFolder(file)) {
        notify("Folders cannot be downloaded", true);
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = downloadUrl(accountId, file.id);
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    },
    [accountId, notify]
  );

  function handleItemClick(file: DriveFile) {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) {
      openItem(file);
      return;
    }

    setSelectedId(file.id);
  }

  function openFileMenu(
    event: ReactMouseEvent<HTMLButtonElement>,
    file: DriveFile
  ) {
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();

    setSelectedId(file.id);
    setMenu({ x: rect.right, y: rect.bottom + 4, file });
  }

  const paste = useCallback(async () => {
    if (!clipboard || clipboard.accountId !== accountId) {
      return;
    }

    try {
      setBusy(true);

      if (clipboard.mode === "copy") {
        await copyFile(accountId, clipboard.file.id, folderId);
        notify(`Copied "${clipboard.file.name}" here`);
      } else {
        await moveFile(accountId, clipboard.file.id, folderId);
        notify(`Moved "${clipboard.file.name}" here`);
        onClipboardChange(null);
      }

      reload();
    } catch (err: unknown) {
      notify(
        err instanceof Error ? err.message : "Paste failed",
        true
      );
    } finally {
      setBusy(false);
    }
  }, [
    clipboard,
    accountId,
    folderId,
    notify,
    onClipboardChange,
    reload,
  ]);

  async function submitRename(name: string) {
    if (dialog?.kind !== "rename") {
      return;
    }

    try {
      setBusy(true);

      await renameFile(accountId, dialog.file.id, name);

      notify(`Renamed to "${name}"`);
      setDialog(null);
      reload();
    } catch (err: unknown) {
      notify(
        err instanceof Error ? err.message : "Rename failed",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (dialog?.kind !== "delete") {
      return;
    }

    try {
      setBusy(true);

      await deleteFile(accountId, dialog.file.id);

      notify(`"${dialog.file.name}" moved to trash`);
      setDialog(null);
      setSelectedId(null);
      reload();
    } catch (err: unknown) {
      notify(
        err instanceof Error ? err.message : "Delete failed",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitNewFolder(name: string) {
    try {
      setBusy(true);

      await createFolder(accountId, folderId, name);

      notify(`Created folder "${name}"`);
      setDialog(null);
      reload();
    } catch (err: unknown) {
      notify(
        err instanceof Error ? err.message : "Could not create the folder",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleStar(file: DriveFile) {
    const next = !file.starred;

    try {
      setBusy(true);

      const res = await setStarred(accountId, file.id, next);

      setFiles((prev) =>
        prev.map((item) => (item.id === file.id ? res.file : item))
      );

      notify(
        next
          ? `Added "${file.name}" to favorites`
          : `Removed "${file.name}" from favorites`
      );
    } catch (err: unknown) {
      notify(
        err instanceof Error ? err.message : "Could not update favorites",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;

      if (
        dialog ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      const ctrl = event.ctrlKey || event.metaKey;

      if (ctrl && event.key.toLowerCase() === "v") {
        event.preventDefault();
        paste();
        return;
      }

      if (!selected) {
        return;
      }

      if (ctrl && event.key.toLowerCase() === "c") {
        event.preventDefault();
        onClipboardChange({ mode: "copy", file: selected, accountId });
        notify(`Copied "${selected.name}"`);
        return;
      }

      if (ctrl && event.key.toLowerCase() === "x") {
        event.preventDefault();
        onClipboardChange({ mode: "cut", file: selected, accountId });
        notify(`Cut "${selected.name}"`);
        return;
      }

      if (event.key === "F2") {
        event.preventDefault();
        setDialog({ kind: "rename", file: selected });
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        setDialog({ kind: "delete", file: selected });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        openItem(selected);
        return;
      }

      if (event.key === "Escape") {
        setSelectedId(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    selected,
    dialog,
    accountId,
    paste,
    openItem,
    notify,
    onClipboardChange,
  ]);

  function buildFileMenu(file: DriveFile): MenuItem[] {
    const caps = file.capabilities || {};
    const folder = isFolder(file);

    return [
      {
        kind: "item",
        label: folder ? "Open" : "Open in Drive",
        icon: folder ? FolderOpen : ExternalLink,
        onSelect: () => openItem(file),
      },
      {
        kind: "item",
        label: "Download",
        icon: Download,
        disabled: folder || caps.canDownload === false,
        onSelect: () => download(file),
      },
      { kind: "separator" },
      {
        kind: "item",
        label: "Copy",
        icon: Copy,
        shortcut: "Ctrl+C",
        disabled: caps.canCopy === false || folder,
        onSelect: () => {
          onClipboardChange({ mode: "copy", file, accountId });
          notify(`Copied "${file.name}"`);
        },
      },
      {
        kind: "item",
        label: "Cut",
        icon: Scissors,
        shortcut: "Ctrl+X",
        disabled: caps.canEdit === false,
        onSelect: () => {
          onClipboardChange({ mode: "cut", file, accountId });
          notify(`Cut "${file.name}"`);
        },
      },
      {
        kind: "item",
        label: clipboard
          ? `Paste "${clipboard.file.name}"`
          : "Paste",
        icon: ClipboardPaste,
        shortcut: "Ctrl+V",
        disabled: !canPaste,
        onSelect: paste,
      },
      { kind: "separator" },
      {
        kind: "item",
        label: "Rename",
        icon: Pencil,
        shortcut: "F2",
        disabled: caps.canRename === false,
        onSelect: () => setDialog({ kind: "rename", file }),
      },
      {
        kind: "item",
        label: "Share",
        icon: Share2,
        disabled: caps.canShare === false,
        onSelect: () => setDialog({ kind: "share", file }),
      },
      {
        kind: "item",
        label: file.starred ? "Remove from favorites" : "Add to favorites",
        icon: file.starred ? StarOff : Star,
        onSelect: () => toggleStar(file),
      },
      { kind: "separator" },
      {
        kind: "item",
        label: "Move to trash",
        icon: Trash2,
        shortcut: "Del",
        danger: true,
        disabled: caps.canDelete === false,
        onSelect: () => setDialog({ kind: "delete", file }),
      },
    ];
  }

  function buildBackgroundMenu(): MenuItem[] {
    return [
      {
        kind: "item",
        label: "New folder",
        icon: FolderPlus,
        onSelect: () => setDialog({ kind: "newFolder" }),
      },
      { kind: "separator" },
      {
        kind: "item",
        label: clipboard ? `Paste "${clipboard.file.name}"` : "Paste",
        icon: ClipboardPaste,
        shortcut: "Ctrl+V",
        disabled: !canPaste,
        onSelect: paste,
      },
      { kind: "separator" },
      ...(Object.keys(SORT_LABELS) as SortKey[]).map<MenuItem>((key) => ({
        kind: "item",
        label: `Sort by ${SORT_LABELS[key]}`,
        icon: sortKey === key ? ArrowDownAZ : undefined,
        onSelect: () => setSortKey(key),
      })),
      {
        kind: "item",
        label:
          sortDirection === "asc"
            ? "Descending order"
            : "Ascending order",
        icon: sortDirection === "asc" ? ArrowUpAZ : ArrowDownAZ,
        onSelect: () =>
          setSortDirection(sortDirection === "asc" ? "desc" : "asc"),
      },
      { kind: "separator" },
      {
        kind: "item",
        label: "Refresh",
        icon: RefreshCw,
        onSelect: reload,
      },
    ];
  }

  if (loading) {
    return <ExplorerLoadingSkeleton viewMode={viewMode} />;
  }

  if (error) {
    return (
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="break-words text-red-400">{error}</p>

        <button
          onClick={reload}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-600"
        >
          Try again
        </button>
      </main>
    );
  }

  return (
    <main
      onContextMenu={(event) => {
        event.preventDefault();
        setSelectedId(null);
        setMenu({ x: event.clientX, y: event.clientY, file: null });
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setSelectedId(null);
        }
      }}
      className="relative min-w-0 flex-1 overflow-auto bg-[#1B1B1B] p-4 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-500">Sort by</span>

        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`rounded-lg px-3 py-1.5 transition ${
              sortKey === key
                ? "bg-[#0E639C] text-white"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {SORT_LABELS[key]}
          </button>
        ))}

        <button
          onClick={() =>
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
          }
          title={
            sortDirection === "asc" ? "Ascending" : "Descending"
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-zinc-800 sm:h-auto sm:w-auto sm:p-1.5"
        >
          {sortDirection === "asc" ? (
            <ArrowDownAZ size={18} />
          ) : (
            <ArrowUpAZ size={18} />
          )}
        </button>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
          <button
            onClick={() => setDialog({ kind: "newFolder" })}
            title="New folder"
            className="flex h-10 items-center gap-2 rounded-lg bg-zinc-800 px-3 text-zinc-200 transition hover:bg-zinc-700 lg:hidden"
          >
            <FolderPlus size={16} />
            New folder
          </button>

          {clipboard && (
            <button
              onClick={paste}
              disabled={!canPaste}
              className="flex h-10 min-w-0 items-center gap-2 rounded-lg bg-zinc-800 px-3 text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:py-1.5"
            >
              <ClipboardPaste size={16} />
              Paste
              <span className="hidden max-w-[140px] truncate text-zinc-500 md:inline">
                {clipboard.file.name}
              </span>
            </button>
          )}

          <button
            onClick={reload}
            title="Refresh"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-zinc-800 sm:h-auto sm:w-auto sm:p-1.5"
          >
            <RefreshCw size={18} />
          </button>

          <div className="flex h-10 items-center gap-0.5 rounded-lg bg-zinc-800 p-0.5 sm:h-auto">
            <button
              onClick={() => changeViewMode("grid")}
              title="Grid view"
              className={`rounded-md p-1.5 transition ${
                viewMode === "grid"
                  ? "bg-[#0E639C] text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutGrid size={16} />
            </button>

            <button
              onClick={() => changeViewMode("list")}
              title="List view"
              className={`rounded-md p-1.5 transition ${
                viewMode === "list"
                  ? "bg-[#0E639C] text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${
            toastIsError
              ? "bg-red-500/10 text-red-300"
              : "bg-green-500/10 text-green-300"
          }`}
        >
          {toast}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-zinc-500">This folder is empty</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-800">
          <div className="flex min-w-0 items-center gap-3 border-b border-zinc-800 bg-[#202020] px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 sm:gap-4 sm:px-4">
            <span className="w-9 shrink-0" />

            <button
              onClick={() => setSortKey("name")}
              className={`flex-1 text-left transition hover:text-zinc-200 ${
                sortKey === "name" ? "text-zinc-200" : ""
              }`}
            >
              Name
            </button>

            <span className="hidden w-28 shrink-0 text-left sm:block">
              Owner
            </span>

            <button
              onClick={() => setSortKey("modified")}
              className={`hidden w-40 shrink-0 text-left transition hover:text-zinc-200 sm:block ${
                sortKey === "modified" ? "text-zinc-200" : ""
              }`}
            >
              Date modified
            </button>

            <button
              onClick={() => setSortKey("size")}
              className={`hidden w-20 shrink-0 text-right transition hover:text-zinc-200 sm:block ${
                sortKey === "size" ? "text-zinc-200" : ""
              }`}
            >
              Size
            </button>

            <span className="w-10 shrink-0 lg:hidden" />
          </div>

          {sorted.map((file) => {
            const isSelected = file.id === selectedId;
            const isCut =
              clipboard?.mode === "cut" &&
              clipboard.file.id === file.id &&
              clipboard.accountId === accountId;

            return (
              <div
                key={file.id}
                onMouseDown={(event) => {
                  if (event.detail > 1) {
                    event.preventDefault();
                  }
                }}
                onClick={() => handleItemClick(file)}
                onDoubleClick={() => openItem(file)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedId(file.id);
                  setMenu({
                    x: event.clientX,
                    y: event.clientY,
                    file,
                  });
                }}
                title={file.name}
                className={`flex min-w-0 cursor-pointer select-none items-center gap-3 border-b border-zinc-800/60 px-3 py-2 transition-colors last:border-b-0 sm:gap-4 sm:px-4 ${
                  isSelected
                    ? "bg-[#0E639C]/15"
                    : "bg-[#252525] hover:bg-zinc-800/60"
                } ${isCut ? "opacity-50" : ""}`}
              >
                <span className="flex w-9 shrink-0 items-center justify-center">
                  {getIcon(file, 20)}
                </span>

                <span className="flex-1 truncate text-sm">
                  {file.name}
                </span>

                <span className="hidden w-28 shrink-0 truncate text-sm text-zinc-500 sm:block">
                  {ownerLabel(file)}
                </span>

                <span className="hidden w-40 shrink-0 truncate text-sm text-zinc-500 sm:block">
                  {new Date(file.modifiedTime).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "short", day: "numeric" }
                  )}
                </span>

                <span className="hidden w-20 shrink-0 text-right text-sm text-zinc-500 sm:block">
                  {isFolder(file) ? "\u2014" : formatSize(file.size)}
                </span>

                <button
                  type="button"
                  title={`Actions for ${file.name}`}
                  onClick={(event) => openFileMenu(event, file)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-700 hover:text-white lg:hidden"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {sorted.map((file) => {
            const isSelected = file.id === selectedId;
            const isCut =
              clipboard?.mode === "cut" &&
              clipboard.file.id === file.id &&
              clipboard.accountId === accountId;

            return (
              <div
                key={file.id}
                onMouseDown={(event) => {
                  if (event.detail > 1) {
                    event.preventDefault();
                  }
                }}
                onClick={() => handleItemClick(file)}
                onDoubleClick={() => openItem(file)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedId(file.id);
                  setMenu({
                    x: event.clientX,
                    y: event.clientY,
                    file,
                  });
                }}
                title={file.name}
                className={`relative min-w-0 cursor-pointer select-none rounded-xl border p-4 transition-all duration-150 sm:p-5 ${
                  isSelected
                    ? "border-[#0E639C] bg-[#0E639C]/15"
                    : "border-zinc-800 bg-[#252525] hover:border-[#0E639C] hover:shadow-lg"
                } ${isCut ? "opacity-50" : ""}`}
              >
                <button
                  type="button"
                  title={`Actions for ${file.name}`}
                  onClick={(event) => openFileMenu(event, file)}
                  className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-700 hover:text-white lg:hidden"
                >
                  <MoreVertical size={18} />
                </button>

                <div className="mb-4 flex justify-center">
                  {getIcon(file)}
                </div>

                <h2 className="truncate text-center font-medium">
                  {file.name}
                </h2>

                <p className="mt-2 truncate text-center text-xs text-zinc-500">
                  {new Date(file.modifiedTime).toLocaleDateString()}
                  {file.size ? ` · ${formatSize(file.size)}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {(hasMore || loadMoreError) && (
        <div className="mt-5 flex flex-col items-center gap-2">
          {loadMoreError && (
            <p className="text-sm text-red-400">{loadMoreError}</p>
          )}

          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="min-h-10 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-50"
          >
            {loadingMore
              ? "Loading more..."
              : loadMoreError
              ? "Try again"
              : "Load more"}
          </button>
        </div>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={
            menu.file
              ? buildFileMenu(menu.file)
              : buildBackgroundMenu()
          }
          onClose={() => setMenu(null)}
        />
      )}

      {dialog?.kind === "rename" && (
        <RenameDialog
          file={dialog.file}
          busy={busy}
          onCancel={() => setDialog(null)}
          onSubmit={submitRename}
        />
      )}

      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="Move to trash"
          message={`"${dialog.file.name}" will be moved to your Google Drive trash. You can restore it from Drive within 30 days.`}
          confirmLabel="Move to trash"
          danger
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={confirmDelete}
        />
      )}

      {dialog?.kind === "share" && (
        <ShareDialog
          accountId={accountId}
          file={dialog.file}
          onClose={() => setDialog(null)}
          onShared={(message) => notify(message)}
        />
      )}

      {dialog?.kind === "newFolder" && (
        <NewFolderDialog
          busy={busy}
          onCancel={() => setDialog(null)}
          onSubmit={submitNewFolder}
        />
      )}
    </main>
  );
}
