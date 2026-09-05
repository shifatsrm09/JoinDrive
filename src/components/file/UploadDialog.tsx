import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Gauge,
  HardDrive,
  Loader2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import Modal from "../ui/Modal";
import { createFolder, getFiles, uploadFile } from "../../api/drive";
import { isFolder } from "../../types/drive";
import type { DriveFile } from "../../types/drive";
import { useAuth } from "../../context/auth-context";

export type UploadLocation = {
  accountId: string;
  accountLabel: string;
  folderId: string;
  folderName: string;
};

export type UploadMode = "files" | "folder";

type UploadDialogProps = {
  mode: UploadMode;
  onClose: () => void;
  onUploaded: (accountId: string, folderId: string) => void;
  initialLocation?: UploadLocation;
};

type Step = "account" | "folder" | "uploading";

type PathEntry = { id: string; name: string };

type UploadItem = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  speed: number;
  error?: string;
};

function formatSize(bytes: number) {
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

export default function UploadDialog({
  mode,
  onClose,
  onUploaded,
  initialLocation,
}: UploadDialogProps) {
  const { user } = useAuth();
  const accounts = user?.accounts ?? [];

  const locked = !!initialLocation;
  const onlyAccount = !locked && accounts.length === 1 ? accounts[0] : null;

  const [step, setStep] = useState<Step>(
    locked || onlyAccount ? "folder" : "account"
  );

  const [accountId, setAccountId] = useState(
    initialLocation?.accountId || onlyAccount?._id || ""
  );
  const [accountLabel, setAccountLabel] = useState(
    initialLocation?.accountLabel || onlyAccount?.email || ""
  );

  const [path, setPath] = useState<PathEntry[]>(
    initialLocation
      ? [{ id: initialLocation.folderId, name: initialLocation.folderName }]
      : onlyAccount
      ? [{ id: "root", name: onlyAccount.email }]
      : []
  );
  const currentFolder = path[path.length - 1];

  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(
    !locked && step === "folder" && !!accountId && !!currentFolder
  );
  const [folderError, setFolderError] = useState("");

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("New Folder");
  const [creatingFolderBusy, setCreatingFolderBusy] = useState(false);
  const [creatingFolderError, setCreatingFolderError] = useState("");

  const [items, setItems] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const dialogTitle =
    mode === "folder" ? "Upload folder to Drive" : "Upload files to Drive";

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");

    return () => uploadControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (locked || step !== "folder" || !accountId || !currentFolder) {
      return;
    }

    let cancelled = false;

    getFiles(currentFolder.id, accountId, undefined, 200)
      .then((res) => {
        if (!cancelled) {
          setFolders((res.files || []).filter(isFolder));
          setFolderError("");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFolderError(
            err instanceof Error ? err.message : "Failed to load folders"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingFolders(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locked, step, accountId, currentFolder]);

  function selectAccount(id: string, email: string) {
    setLoadingFolders(true);
    setAccountId(id);
    setAccountLabel(email);
    setPath([{ id: "root", name: email }]);
    setStep("folder");
  }

  function enterFolder(folder: DriveFile) {
    setCreatingFolder(false);
    setLoadingFolders(true);
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function jumpTo(index: number) {
    setCreatingFolder(false);
    setLoadingFolders(true);
    setPath((prev) => prev.slice(0, index + 1));
  }

  function openNewFolderForm() {
    setNewFolderName("New Folder");
    setCreatingFolderError("");
    setCreatingFolder(true);
  }

  async function submitNewFolder(event: FormEvent) {
    event.preventDefault();

    const trimmed = newFolderName.trim();

    if (!trimmed || creatingFolderBusy || !currentFolder) {
      return;
    }

    try {
      setCreatingFolderBusy(true);
      setCreatingFolderError("");

      const res = await createFolder(accountId, currentFolder.id, trimmed);

      setLoadingFolders(true);
      setPath((prev) => [...prev, { id: res.file.id, name: res.file.name }]);
      setNewFolderName("New Folder");
      setCreatingFolder(false);
    } catch (err: unknown) {
      setCreatingFolderError(
        err instanceof Error ? err.message : "Could not create the folder"
      );
    } finally {
      setCreatingFolderBusy(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openFolderPicker() {
    folderInputRef.current?.click();
  }

  function openSelectedPicker() {
    if (mode === "folder") {
      openFolderPicker();
    } else {
      openFilePicker();
    }
  }

  function handleFilesSelected(
    fileList: FileList | null,
    uploadMode: "files" | "folder"
  ) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const chosen: UploadItem[] = Array.from(fileList).map((file) => ({
      file,
      status: "pending",
      progress: 0,
      speed: 0,
    }));

    const controller = new AbortController();

    uploadControllerRef.current?.abort();
    uploadControllerRef.current = controller;
    setItems(chosen);
    setStep("uploading");
    void runUploads(chosen, controller, uploadMode);
  }

  async function ensureUploadFolder(
    file: File,
    folderIds: Map<string, string>,
    controller: AbortController
  ) {
    const parts = (file.webkitRelativePath || file.name)
      .split("/")
      .filter(Boolean)
      .slice(0, -1);
    let parentId = currentFolder.id;
    let relativePath = "";

    for (const folderName of parts) {
      if (controller.signal.aborted) {
        throw new Error("Upload cancelled");
      }

      relativePath = relativePath
        ? `${relativePath}/${folderName}`
        : folderName;

      const existingId = folderIds.get(relativePath);

      if (existingId) {
        parentId = existingId;
        continue;
      }

      const res = await createFolder(accountId, parentId, folderName);

      folderIds.set(relativePath, res.file.id);
      parentId = res.file.id;
    }

    return parentId;
  }

  async function runUploads(
    list: UploadItem[],
    controller: AbortController,
    uploadMode: "files" | "folder"
  ) {
    const folderIds = new Map<string, string>();
    let successfulUploads = 0;

    try {
      for (let i = 0; i < list.length; i++) {
        if (controller.signal.aborted) {
          return;
        }

        setItems((prev) =>
          prev.map((item, index) =>
            index === i
              ? { ...item, status: "uploading", progress: 0, speed: 0 }
              : item
          )
        );

        try {
          const destinationFolderId =
            uploadMode === "folder"
              ? await ensureUploadFolder(list[i].file, folderIds, controller)
              : currentFolder.id;

          if (controller.signal.aborted) {
            return;
          }

          let sampledAt = performance.now();
          let sampledBytes = 0;
          let displayedSpeed = 0;

          await uploadFile(accountId, destinationFolderId, list[i].file, {
            signal: controller.signal,
            onProgress: (uploaded, total) => {
              const progress =
                total > 0 ? Math.round((uploaded / total) * 100) : 0;
              const now = performance.now();
              const elapsedSeconds = (now - sampledAt) / 1000;

              if (elapsedSeconds >= 0.4 || uploaded === total) {
                const currentSpeed =
                  (uploaded - sampledBytes) / elapsedSeconds / (1024 * 1024);

                displayedSpeed =
                  displayedSpeed > 0
                    ? displayedSpeed * 0.65 + currentSpeed * 0.35
                    : currentSpeed;
                sampledAt = now;
                sampledBytes = uploaded;
              }

              setItems((prev) =>
                prev.map((item, index) =>
                  index === i
                    ? { ...item, progress, speed: displayedSpeed }
                    : item
                )
              );
            },
          });

          setItems((prev) =>
            prev.map((item, index) =>
              index === i
                ? { ...item, status: "done", progress: 100, speed: 0 }
                : item
            )
          );
          successfulUploads += 1;
        } catch (err: unknown) {
          if (controller.signal.aborted) {
            return;
          }

          setItems((prev) =>
            prev.map((item, index) =>
              index === i
                ? {
                    ...item,
                    status: "error",
                    error:
                      err instanceof Error ? err.message : "Upload failed",
                  }
                : item
            )
          );
        }
      }
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
      }

      if (successfulUploads > 0) {
        onUploaded(accountId, currentFolder.id);
      }
    }
  }

  const allSettled =
    items.length > 0 &&
    items.every((item) => item.status === "done" || item.status === "error");

  const successCount = items.filter((item) => item.status === "done").length;

  function finish() {
    onClose();
  }

  function closeDialog() {
    uploadControllerRef.current?.abort();
    onClose();
  }

  if (step === "uploading") {
    return (
      <section
        role="dialog"
        aria-label="Upload progress"
        className="fixed bottom-3 right-3 z-50 flex max-h-[min(32rem,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-[360px] flex-col overflow-hidden rounded-xl border border-zinc-700 bg-[#252525] shadow-2xl sm:bottom-4 sm:right-4"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-700 px-3 py-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">
              {allSettled ? "Upload complete" : "Uploading to Drive"}
            </h2>
            <p className="truncate text-xs text-zinc-500">
              {currentFolder?.name} · {accountLabel}
            </p>
          </div>

          <button
            type="button"
            aria-label={allSettled ? "Close upload" : "Cancel upload"}
            onClick={allSettled ? finish : closeDialog}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-3">
          <div className="max-h-52 space-y-1.5 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-[#1B1B1B] px-2.5 py-2"
              >
                {item.status === "uploading" && (
                  <Loader2
                    size={15}
                    className="shrink-0 animate-spin text-[#4DA3FF]"
                  />
                )}
                {item.status === "pending" && (
                  <UploadCloud size={15} className="shrink-0 text-zinc-500" />
                )}
                {item.status === "done" && (
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-green-400"
                  />
                )}
                {item.status === "error" && (
                  <XCircle size={15} className="shrink-0 text-red-400" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-zinc-200">
                    {item.file.webkitRelativePath || item.file.name}
                  </p>
                  {item.error ? (
                    <p className="truncate text-[11px] text-zinc-500">
                      {item.error}
                    </p>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2 text-[11px] text-zinc-500">
                      <span className="min-w-0 truncate">
                        {formatSize(item.file.size)}
                        {item.status === "uploading"
                          ? ` · ${item.progress}%`
                          : ""}
                      </span>

                      {item.status === "uploading" && (
                        <span className="ml-auto flex shrink-0 items-center gap-1 text-[#4DA3FF]">
                          <Gauge size={12} />
                          {item.speed.toFixed(1)} MB/s
                        </span>
                      )}
                    </div>
                  )}

                  {item.status === "uploading" && (
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-[#0E639C] transition-[width]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={allSettled ? finish : closeDialog}
              className={`min-h-10 rounded-lg px-3 py-2 text-xs font-medium transition ${
                allSettled
                  ? "bg-[#0E639C] text-white hover:bg-[#1177b8]"
                  : "text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {allSettled
                ? `Done (${successCount}/${items.length})`
                : "Cancel upload"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <Modal title={dialogTitle} onClose={closeDialog}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handleFilesSelected(event.target.files, "files")}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handleFilesSelected(event.target.files, "folder")}
      />

      {step === "account" && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Choose which connected Drive to use.
          </p>

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {accounts.map((account) => (
              <button
                key={account._id}
                onClick={() => selectAccount(account._id, account.email)}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-zinc-700 px-3 py-2.5 text-left text-sm transition hover:border-[#0E639C] hover:bg-[#0E639C]/10"
              >
                <HardDrive size={18} className="shrink-0 text-[#4DA3FF]" />
                <span className="truncate">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "folder" && locked && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-[#1B1B1B] px-3 py-2.5">
            <Folder size={18} className="shrink-0 text-blue-400" />
            <div className="min-w-0">
              <p className="truncate text-sm text-zinc-200">
                {currentFolder?.name}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {accountLabel}
              </p>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Uploading into the folder you currently have open.
          </p>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              onClick={closeDialog}
              className="min-h-11 rounded-lg px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
            >
              Cancel
            </button>

            <button
              onClick={openSelectedPicker}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-[#0E639C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1177b8]"
            >
              <FolderOpen size={16} />
              {mode === "folder" ? "Choose folder" : "Choose files"}
            </button>
          </div>
        </div>
      )}

      {step === "folder" && !locked && (
        <div className="space-y-3">
          <div className="flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto pb-1 text-xs text-zinc-400">
            {accounts.length > 1 && (
              <>
                <button
                  onClick={() => setStep("account")}
                  className="rounded px-1.5 py-0.5 transition hover:bg-zinc-700 hover:text-white"
                >
                  Change Drive
                </button>
                <ChevronRight size={12} />
              </>
            )}

            {path.map((entry, index) => (
              <span
                key={entry.id + index}
                className="flex shrink-0 items-center gap-1"
              >
                {index > 0 && <ChevronRight size={12} />}
                <button
                  onClick={() => jumpTo(index)}
                  disabled={index === path.length - 1}
                  className={`max-w-[140px] truncate rounded px-1.5 py-0.5 transition ${
                    index === path.length - 1
                      ? "cursor-default text-white"
                      : "hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  {entry.name}
                </button>
              </span>
            ))}
          </div>

          <div className="h-56 overflow-y-auto rounded-lg border border-zinc-700">
            {creatingFolder && (
              <form
                onSubmit={submitNewFolder}
                className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-[#1B1B1B] px-3 py-2"
              >
                <FolderPlus size={16} className="shrink-0 text-blue-400" />

                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  onFocus={(event) => event.target.select()}
                  className="min-w-32 flex-1 rounded border border-zinc-600 bg-[#252525] px-2 py-1 text-sm text-white outline-none focus:border-[#0E639C]"
                />

                <button
                  type="button"
                  onClick={() => setCreatingFolder(false)}
                  className="min-h-10 shrink-0 rounded px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-700 hover:text-white sm:min-h-0"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!newFolderName.trim() || creatingFolderBusy}
                  className="min-h-10 shrink-0 rounded bg-[#0E639C] px-2 py-1 text-xs font-medium text-white transition hover:bg-[#1177b8] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0"
                >
                  {creatingFolderBusy ? "Creating..." : "Create"}
                </button>
              </form>
            )}

            {creatingFolderError && (
              <p className="border-b border-zinc-800 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
                {creatingFolderError}
              </p>
            )}

            {loadingFolders ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Loading folders...
              </div>
            ) : folderError ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-red-400">
                {folderError}
              </div>
            ) : folders.length === 0 && !creatingFolder ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                No subfolders here
              </div>
            ) : (
              folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => enterFolder(folder)}
                  className="flex min-h-11 w-full items-center gap-2.5 border-b border-zinc-800 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-zinc-800"
                >
                  <Folder size={16} className="shrink-0 text-blue-400" />
                  <span className="truncate">{folder.name}</span>
                  <ChevronRight
                    size={14}
                    className="ml-auto shrink-0 text-zinc-600"
                  />
                </button>
              ))
            )}
          </div>

          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <button
              onClick={openNewFolderForm}
              disabled={creatingFolder}
              className="flex min-h-10 items-center gap-1.5 text-xs text-zinc-400 transition hover:text-white disabled:opacity-40 sm:min-h-0"
            >
              <FolderPlus size={14} />
              New folder
            </button>

            <p className="min-w-0 max-w-full break-words text-xs text-zinc-500 sm:text-right">
              Uploading into{" "}
              <span className="text-zinc-300">{currentFolder?.name}</span>
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              onClick={closeDialog}
              className="min-h-11 rounded-lg px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
            >
              Cancel
            </button>

            <button
              onClick={openSelectedPicker}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-[#0E639C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1177b8]"
            >
              <FolderOpen size={16} />
              {mode === "folder" ? "Choose folder here" : "Choose files here"}
            </button>
          </div>
        </div>
      )}

    </Modal>
  );
}
