import { apiFetch } from "./client";
import { API_BASE_URL } from "./config";
import type { DriveAccount, DriveFile } from "../types/drive";

export interface DriveAccountsResponse {
  success: boolean;
  accounts: DriveAccount[];
}

export interface DriveInfoResponse {
  success: boolean;
  drive: DriveAccount;
}

export interface DriveFilesResponse {
  success: boolean;
  accountId: string | null;
  currentFolder: string;
  files: DriveFile[];
}

export interface DriveFileResponse {
  success: boolean;
  file: DriveFile;
}

export interface AggregateFile extends DriveFile {
  accountId: string;
  accountEmail: string;
}

export type AggregateView = "recent" | "starred" | "trash";

export interface AggregateResponse {
  success: boolean;
  view: AggregateView;
  files: AggregateFile[];
}

export interface SearchResponse {
  success: boolean;
  query: string;
  files: AggregateFile[];
}

export interface ShareResponse {
  success: boolean;
  file: {
    id: string;
    name: string;
    webViewLink?: string;
    shared?: boolean;
  };
}

export function getAccounts() {
  return apiFetch<DriveAccountsResponse>("/drive/accounts");
}

export function disconnectAccount(accountId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    `/drive/accounts/${encodeURIComponent(accountId)}`,
    {
      method: "DELETE",
    }
  );
}

function scoped(accountId: string | undefined, path: string) {
  return accountId ? `/drive/${accountId}${path}` : `/drive${path}`;
}

export function getDriveInfo(accountId?: string) {
  return apiFetch<DriveInfoResponse>(scoped(accountId, "/info"));
}

export function getFiles(folderId = "root", accountId?: string) {
  return apiFetch<DriveFilesResponse>(
    `${scoped(accountId, "/files")}?folderId=${encodeURIComponent(
      folderId
    )}`
  );
}

export function getAggregate(view: AggregateView) {
  return apiFetch<AggregateResponse>(
    `/drive/aggregate?view=${encodeURIComponent(view)}`
  );
}

export function searchFiles(query: string) {
  return apiFetch<SearchResponse>(
    `/drive/search?q=${encodeURIComponent(query)}`
  );
}

function filePath(accountId: string, fileId: string) {
  return `/drive/${accountId}/files/${encodeURIComponent(fileId)}`;
}

export function renameFile(
  accountId: string,
  fileId: string,
  name: string
) {
  return apiFetch<DriveFileResponse>(
    `${filePath(accountId, fileId)}/rename`,
    {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }
  );
}

export function createFolder(
  accountId: string,
  parentId: string,
  name: string
) {
  return apiFetch<DriveFileResponse>(`/drive/${accountId}/folders`, {
    method: "POST",
    body: JSON.stringify({ name, parentId }),
  });
}

export function deleteFile(accountId: string, fileId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    filePath(accountId, fileId),
    {
      method: "DELETE",
    }
  );
}

export function restoreFile(accountId: string, fileId: string) {
  return apiFetch<DriveFileResponse>(
    `${filePath(accountId, fileId)}/restore`,
    {
      method: "POST",
    }
  );
}

export function copyFile(
  accountId: string,
  fileId: string,
  targetFolderId: string
) {
  return apiFetch<DriveFileResponse>(
    `${filePath(accountId, fileId)}/copy`,
    {
      method: "POST",
      body: JSON.stringify({ targetFolderId }),
    }
  );
}

export function moveFile(
  accountId: string,
  fileId: string,
  targetFolderId: string
) {
  return apiFetch<DriveFileResponse>(
    `${filePath(accountId, fileId)}/move`,
    {
      method: "POST",
      body: JSON.stringify({ targetFolderId }),
    }
  );
}

export function shareFile(
  accountId: string,
  fileId: string,
  options: { type: "anyone" | "user"; role: string; email?: string }
) {
  return apiFetch<ShareResponse>(
    `${filePath(accountId, fileId)}/share`,
    {
      method: "POST",
      body: JSON.stringify(options),
    }
  );
}

export function downloadUrl(accountId: string, fileId: string) {
  return `${API_BASE_URL}${filePath(accountId, fileId)}/download`;
}

interface UploadSessionResponse {
  success: boolean;
  uploadUrl: string;
  fileId: string;
}

type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: (uploaded: number, total: number) => void;
};

type UploadResponse = {
  status: number;
  body: string;
};

class UploadNetworkError extends Error {
  uploaded: number;

  constructor(uploaded: number) {
    super("The connection to Google Drive was interrupted");
    this.name = "UploadNetworkError";
    this.uploaded = uploaded;
  }
}

function abortError() {
  return new DOMException("Upload cancelled", "AbortError");
}

function uploadRequest(
  uploadUrl: string,
  file: File,
  options: UploadOptions
) {
  return new Promise<UploadResponse>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(abortError());
      return;
    }

    const request = new XMLHttpRequest();
    let uploaded = 0;

    function cleanup() {
      options.signal?.removeEventListener("abort", handleAbort);
    }

    function handleAbort() {
      request.abort();
    }

    request.open("PUT", uploadUrl);
    request.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );

    request.upload.onprogress = (event) => {
      uploaded = Math.min(event.loaded, file.size);
      options.onProgress?.(uploaded, file.size);
    };

    request.upload.onload = () => {
      uploaded = file.size;
      options.onProgress?.(file.size, file.size);
    };

    request.onload = () => {
      cleanup();
      resolve({
        status: request.status,
        body: request.responseText,
      });
    };

    request.onerror = () => {
      cleanup();
      reject(new UploadNetworkError(uploaded));
    };

    request.onabort = () => {
      cleanup();
      reject(abortError());
    };

    options.signal?.addEventListener("abort", handleAbort, { once: true });
    request.send(file);
  });
}

function responseMessage(response: UploadResponse) {
  try {
    const parsed = JSON.parse(response.body) as {
      error?: { message?: string };
      message?: string;
    };

    return (
      parsed.error?.message ||
      parsed.message ||
      "Google Drive rejected the upload"
    );
  } catch {
    return response.body || "Google Drive rejected the upload";
  }
}

function completedUpload(response: UploadResponse): DriveFileResponse {
  try {
    const file = JSON.parse(response.body) as DriveFile;

    if (!file.id) {
      throw new Error();
    }

    return { success: true, file };
  } catch {
    throw new Error("Google Drive completed the upload without file details");
  }
}

function waitForVerification(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    function handleAbort() {
      window.clearTimeout(timer);
      reject(abortError());
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, 1000);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

async function verifyUploadedFile(
  accountId: string,
  fileId: string,
  signal?: AbortSignal
) {
  let lastError: unknown = new Error("Google Drive did not confirm the upload");

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await apiFetch<DriveFileResponse>(filePath(accountId, fileId), {
        signal,
      });
    } catch (error: unknown) {
      lastError = error;

      if (attempt < 9) {
        await waitForVerification(signal);
      }
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Google Drive did not confirm the upload: ${lastError.message}`
      : "Google Drive did not confirm the upload"
  );
}

export async function uploadFile(
  accountId: string,
  folderId: string,
  file: File,
  options: UploadOptions = {}
) {
  if (file.size <= 0) {
    throw new Error("The file appears to be empty");
  }

  const session = await apiFetch<UploadSessionResponse>(
    `/drive/${accountId}/upload`,
    {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        folderId,
        size: file.size,
      }),
      signal: options.signal,
    }
  );

  options.onProgress?.(0, file.size);

  try {
    const response = await uploadRequest(session.uploadUrl, file, options);

    if (response.status === 200 || response.status === 201) {
      options.onProgress?.(file.size, file.size);

      try {
        return completedUpload(response);
      } catch {
        return verifyUploadedFile(accountId, session.fileId, options.signal);
      }
    }

    throw new Error(responseMessage(response));
  } catch (error: unknown) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    if (error instanceof UploadNetworkError && error.uploaded >= file.size) {
      return verifyUploadedFile(accountId, session.fileId, options.signal);
    }

    throw error;
  }
}
