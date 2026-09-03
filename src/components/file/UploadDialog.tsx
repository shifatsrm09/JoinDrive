import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Folder,
  FolderOpen,
  HardDrive,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";

import Modal from "../ui/Modal";
import { getFiles, uploadFile } from "../../api/drive";
import { isFolder } from "../../types/drive";
import type { DriveFile } from "../../types/drive";
import { useAuth } from "../../context/AuthContext";

type UploadDialogProps = {
  onClose: () => void;
  /**
   * Fired once uploading finishes, so the caller can jump the explorer
   * to the destination folder and refresh it.
   */
  onUploaded: (
    accountId: string,
    accountLabel: string,
    folderId: string,
    folderName: string
  ) => void;
};

type Step = "account" | "folder" | "uploading";

type PathEntry = { id: string; name: string };

type UploadItem = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function formatSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
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
  onClose,
  onUploaded,
}: UploadDialogProps) {
  const { user } = useAuth();
  const accounts = user?.accounts ?? [];

  const [step, setStep] = useState<Step>("account");

  const [accountId, setAccountId] = useState("");
  const [accountLabel, setAccountLabel] = useState("");

  const [path, setPath] = useState<PathEntry[]>([]);
  const currentFolder = path[path.length - 1];

  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderError, setFolderError] = useState("");

  const [items, setItems] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Skip the account picker entirely when there is only one Drive.
  useEffect(() => {
    if (accounts.length === 1 && step === "account") {
      selectAccount(accounts[0]._id, accounts[0].email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "folder" || !accountId || !currentFolder) {
      return;
    }

    let cancelled = false;
    setLoadingFolders(true);

    getFiles(currentFolder.id, accountId)
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
  }, [step, accountId, currentFolder]);

  function selectAccount(id: string, email: string) {
    setAccountId(id);
    setAccountLabel(email);
    setPath([{ id: "root", name: email }]);
    setStep("folder");
  }

  function enterFolder(folder: DriveFile) {
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function jumpTo(index: number) {
    setPath((prev) => prev.slice(0, index + 1));
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const chosen: UploadItem[] = Array.from(fileList).map((file) => ({
      file,
      status: file.size > MAX_UPLOAD_BYTES ? "error" : "pending",
      error:
        file.size > MAX_UPLOAD_BYTES
          ? "File is larger than the 25MB limit"
          : undefined,
    }));

    setItems(chosen);
    setStep("uploading");
    void runUploads(chosen);
  }

  async function runUploads(list: UploadItem[]) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].status === "error") {
        // Already flagged as too large, skip straight past it.
        continue;
      }

      setItems((prev) =>
        prev.map((item, index) =>
          index === i ? { ...item, status: "uploading" } : item
        )
      );

      try {
        await uploadFile(accountId, currentFolder.id, list[i].file);

        setItems((prev) =>
          prev.map((item, index) =>
            index === i ? { ...item, status: "done" } : item
          )
        );
      } catch (err: unknown) {
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
  }

  const allSettled =
    items.length > 0 &&
    items.every((item) => item.status === "done" || item.status === "error");

  const successCount = items.filter((item) => item.status === "done").length;

  function finish() {
    if (successCount > 0) {
      onUploaded(accountId, accountLabel, currentFolder.id, currentFolder.name);
    }

    onClose();
  }

  return (
    <Modal title="Upload to Drive" onClose={onClose}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handleFilesSelected(event.target.files)}
      />

      {step === "account" && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Choose which connected Drive to upload to.
          </p>

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {accounts.map((account) => (
              <button
                key={account._id}
                onClick={() => selectAccount(account._id, account.email)}
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-700 px-3 py-2.5 text-left text-sm transition hover:border-[#0E639C] hover:bg-[#0E639C]/10"
              >
                <HardDrive size={18} className="shrink-0 text-[#4DA3FF]" />
                <span className="truncate">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "folder" && (
        <div className="space-y-3">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1 text-xs text-zinc-400">
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
              <span key={entry.id + index} className="flex items-center gap-1">
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

          {/* Folder list */}
          <div className="h-56 overflow-y-auto rounded-lg border border-zinc-700">
            {loadingFolders ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Loading folders...
              </div>
            ) : folderError ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-red-400">
                {folderError}
              </div>
            ) : folders.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                No subfolders here
              </div>
            ) : (
              folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => enterFolder(folder)}
                  className="flex w-full items-center gap-2.5 border-b border-zinc-800 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-zinc-800"
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

          <p className="text-xs text-zinc-500">
            Files will be uploaded into{" "}
            <span className="text-zinc-300">
              {currentFolder?.name}
            </span>
            .
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
            >
              Cancel
            </button>

            <button
              onClick={openFilePicker}
              className="flex items-center gap-2 rounded-lg bg-[#0E639C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1177b8]"
            >
              <FolderOpen size={16} />
              Choose files here
            </button>
          </div>
        </div>
      )}

      {step === "uploading" && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Uploading to{" "}
            <span className="text-zinc-200">{currentFolder?.name}</span>{" "}
            in {accountLabel}
          </p>

          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-[#1B1B1B] px-3 py-2"
              >
                {item.status === "uploading" && (
                  <Loader2
                    size={16}
                    className="shrink-0 animate-spin text-[#4DA3FF]"
                  />
                )}
                {item.status === "pending" && (
                  <UploadCloud size={16} className="shrink-0 text-zinc-500" />
                )}
                {item.status === "done" && (
                  <CheckCircle2
                    size={16}
                    className="shrink-0 text-green-400"
                  />
                )}
                {item.status === "error" && (
                  <XCircle size={16} className="shrink-0 text-red-400" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.file.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {item.error || formatSize(item.file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={finish}
              disabled={!allSettled}
              className="rounded-lg bg-[#0E639C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1177b8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {allSettled
                ? `Done (${successCount}/${items.length} uploaded)`
                : "Uploading..."}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
