import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  Image,
  Music,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";

import {
  deleteFile,
  getAggregate,
  restoreFile,
  searchFiles,
} from "../../api/drive";
import type { AggregateFile, AggregateView } from "../../api/drive";
import { isFolder } from "../../types/drive";

type AggregateGridProps = {
  mode: AggregateView | "search";
  query?: string;
  onOpenFolder: (
    accountId: string,
    accountLabel: string,
    id: string,
    name: string
  ) => void;
};

const TITLES: Record<AggregateGridProps["mode"], string> = {
  recent: "Recent",
  starred: "Favorites",
  trash: "Trash",
  search: "Search results",
};

const EMPTY_MESSAGES: Record<AggregateGridProps["mode"], string> = {
  recent: "Nothing opened or edited recently across your drives.",
  starred: "You haven't starred any files yet.",
  trash: "Trash is empty across all your drives.",
  search: "No files matched your search.",
};

function getIcon(file: AggregateFile) {
  const type = file.mimeType;

  if (isFolder(file)) {
    return <Folder size={40} className="text-blue-400" />;
  }

  if (type.startsWith("image/")) {
    return <Image size={40} className="text-green-400" />;
  }

  if (type.startsWith("video/")) {
    return <FileVideo size={40} className="text-purple-400" />;
  }

  if (type.startsWith("audio/")) {
    return <Music size={40} className="text-pink-400" />;
  }

  if (type.includes("spreadsheet") || type.includes("excel")) {
    return <FileSpreadsheet size={40} className="text-emerald-400" />;
  }

  if (type.includes("zip") || type.includes("rar") || type.includes("tar")) {
    return <FileArchive size={40} className="text-yellow-400" />;
  }

  if (
    type.includes("document") ||
    type.includes("text") ||
    type.includes("pdf")
  ) {
    return <FileText size={40} className="text-zinc-300" />;
  }

  return <FileIcon size={40} className="text-zinc-400" />;
}

export default function AggregateGrid({
  mode,
  query = "",
  onOpenFolder,
}: AggregateGridProps) {
  const [files, setFiles] = useState<AggregateFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (mode === "search" && trimmedQuery.length < 2) {
      return;
    }

    let cancelled = false;

    const delay = mode === "search" ? 350 : 0;

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        const res =
          mode === "search"
            ? await searchFiles(trimmedQuery)
            : await getAggregate(mode);

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
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, trimmedQuery, version]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }, []);

  function openItem(file: AggregateFile) {
    if (isFolder(file)) {
      onOpenFolder(file.accountId, file.accountEmail, file.id, file.name);
      return;
    }

    if (file.webViewLink) {
      window.open(file.webViewLink, "_blank", "noopener,noreferrer");
    }
  }

  async function handleRestore(file: AggregateFile) {
    try {
      setBusyId(file.id);
      await restoreFile(file.accountId, file.id);
      notify(`Restored "${file.name}"`);
      reload();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleTrash(file: AggregateFile) {
    try {
      setBusyId(file.id);
      await deleteFile(file.accountId, file.id);
      notify(`"${file.name}" moved to trash`);
      reload();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to move to trash");
    } finally {
      setBusyId(null);
    }
  }

  const title = useMemo(() => TITLES[mode], [mode]);

  if (mode === "search" && trimmedQuery.length < 2) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-[#1B1B1B] p-4 text-center">
        <p className="text-zinc-500">Keep typing to search your drives...</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-[#1B1B1B] p-4">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-[#1B1B1B] p-4 text-center">
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
    <main className="relative min-w-0 flex-1 overflow-auto bg-[#1B1B1B] p-4 sm:p-6">
      <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-xl font-bold sm:text-2xl">
          {mode === "search" ? `Results for "${trimmedQuery}"` : title}
        </h1>

        {mode !== "search" && (
          <button
            onClick={reload}
            title="Refresh"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-zinc-800 sm:h-auto sm:w-auto sm:p-1.5"
          >
            <RefreshCw size={18} />
          </button>
        )}
      </div>

      {toast && (
        <div className="mb-4 break-words rounded-lg bg-green-500/10 px-4 py-2.5 text-sm text-green-300">
          {toast}
        </div>
      )}

      {files.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20 text-center">
          <p className="text-zinc-500">{EMPTY_MESSAGES[mode]}</p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => {
            const folder = isFolder(file);
            const busy = busyId === file.id;

            return (
              <div
                key={`${file.accountId}-${file.id}`}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-zinc-800 bg-[#252525] p-3 transition-all duration-150 hover:border-[#0E639C] sm:gap-3 sm:p-4"
              >
                <button
                  onClick={() => openItem(file)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  title={file.name}
                >
                  <span className="shrink-0">{getIcon(file)}</span>

                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {file.accountEmail}
                    </p>
                    <p className="truncate text-xs text-zinc-600">
                      {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openItem(file)}
                    title={folder ? "Open" : "Open in Drive"}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-700 hover:text-white sm:h-auto sm:w-auto sm:p-2"
                  >
                    {folder ? (
                      <FolderOpen size={16} />
                    ) : (
                      <ExternalLink size={16} />
                    )}
                  </button>

                  {mode === "trash" ? (
                    <button
                      onClick={() => handleRestore(file)}
                      disabled={busy}
                      title="Restore"
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-700 hover:text-white disabled:opacity-40 sm:h-auto sm:w-auto sm:p-2"
                    >
                      <RotateCcw size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTrash(file)}
                      disabled={busy}
                      title="Move to trash"
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40 sm:h-auto sm:w-auto sm:p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
