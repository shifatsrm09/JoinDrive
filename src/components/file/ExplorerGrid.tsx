import { useCallback, useEffect, useMemo, useState } from "react";
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
  Pencil,
  RefreshCw,
  Scissors,
  Share2,
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
  getFiles,
  moveFile,
  renameFile,
} from "../../api/drive";

import { isFolder } from "../../types/drive";
import type {
  Clipboard,
  DriveFile,
  SortDirection,
  SortKey,
} from "../../types/drive";

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

/**
 * Just the local part of the owner's email (the bit before the "@"),
 * the way Google Drive's own list view shows it. Falls back to the
 * display name if there's no email for some reason.
 */
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

export default function ExplorerGrid({
  accountId,
  folderId,
  clipboard,
  onClipboardChange,
  onOpenFolder,
}: ExplorerGridProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

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

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const notify = useCallback((message: string, isError = false) => {
    setToast(message);
    setToastIsError(isError);

    window.setTimeout(() => setToast(""), 4000);
  }, []);

  // Refetch whenever the folder, the account, or a mutation changes,
  // so switching drives never shows the previous account's files.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await getFiles(folderId, accountId);

        if (!cancelled) {
          setFiles(res.files || []);
          setError("");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load files"
          );
          setFiles([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [folderId, accountId, version]);

  const sorted = useMemo(() => {
    const factor = sortDirection === "asc" ? 1 : -1;

    return [...files].sort((a, b) => {
      // Folders always lead, the way a file explorer behaves.
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

  /* ---------------------------------------------------------------- */
  /* Actions                                                          */
  /* ---------------------------------------------------------------- */

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

      // A normal navigation lets the browser show its own save dialog
      // and sends the session cookie with the request.
      const anchor = document.createElement("a");
      anchor.href = downloadUrl(accountId, file.id);
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    },
    [accountId, notify]
  );

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

  /* ---------------------------------------------------------------- */
  /* Keyboard shortcuts                                               */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;

      // Never hijack typing inside a dialog.
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

  /* ---------------------------------------------------------------- */
  /* Context menus                                                    */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">Loading files...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-red-400">{error}</p>

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
        // Clicking empty space clears the selection.
        if (event.target === event.currentTarget) {
          setSelectedId(null);
        }
      }}
      className="relative flex-1 overflow-auto bg-[#1B1B1B] p-6"
    >
      {/* Action bar */}
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
          className="rounded-lg p-1.5 text-zinc-300 transition hover:bg-zinc-800"
        >
          {sortDirection === "asc" ? (
            <ArrowDownAZ size={18} />
          ) : (
            <ArrowUpAZ size={18} />
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {clipboard && (
            <button
              onClick={paste}
              disabled={!canPaste}
              className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ClipboardPaste size={16} />
              Paste
              <span className="max-w-[140px] truncate text-zinc-500">
                {clipboard.file.name}
              </span>
            </button>
          )}

          <button
            onClick={reload}
            title="Refresh"
            className="rounded-lg p-1.5 text-zinc-300 transition hover:bg-zinc-800"
          >
            <RefreshCw size={18} />
          </button>

          <div className="flex items-center gap-0.5 rounded-lg bg-zinc-800 p-0.5">
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
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <div className="flex items-center gap-4 border-b border-zinc-800 bg-[#202020] px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
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
              className={`w-20 shrink-0 text-right transition hover:text-zinc-200 ${
                sortKey === "size" ? "text-zinc-200" : ""
              }`}
            >
              Size
            </button>
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
                onClick={() => setSelectedId(file.id)}
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
                className={`flex cursor-pointer select-none items-center gap-4 border-b border-zinc-800/60 px-4 py-2 transition-colors last:border-b-0 ${
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

                <span className="w-20 shrink-0 text-right text-sm text-zinc-500">
                  {isFolder(file) ? "\u2014" : formatSize(file.size)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {sorted.map((file) => {
            const isSelected = file.id === selectedId;
            const isCut =
              clipboard?.mode === "cut" &&
              clipboard.file.id === file.id &&
              clipboard.accountId === accountId;

            return (
              <div
                key={file.id}
                // Suppressing the second mousedown stops the browser
                // from selecting the label text on a double click.
                onMouseDown={(event) => {
                  if (event.detail > 1) {
                    event.preventDefault();
                  }
                }}
                onClick={() => setSelectedId(file.id)}
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
                className={`cursor-pointer select-none rounded-xl border p-5 transition-all duration-150 ${
                  isSelected
                    ? "border-[#0E639C] bg-[#0E639C]/15"
                    : "border-zinc-800 bg-[#252525] hover:border-[#0E639C] hover:shadow-lg"
                } ${isCut ? "opacity-50" : ""}`}
              >
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
