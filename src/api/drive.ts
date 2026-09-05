import { ApiError, apiFetch } from "./client";
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
  nextPageToken: string | null;
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

export function getAccounts(refreshStorage = false) {
  return apiFetch<DriveAccountsResponse>(
    `/drive/accounts${refreshStorage ? "?refreshStorage=true" : ""}`
  );
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

export function getFiles(
  folderId = "root",
  accountId?: string,
  pageToken?: string,
  pageSize = 50
) {
  const params = new URLSearchParams({
    folderId,
    pageSize: String(pageSize),
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  return apiFetch<DriveFilesResponse>(
    `${scoped(accountId, "/files")}?${params.toString()}`
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
  name: string,
  signal?: AbortSignal
) {
  return apiFetch<DriveFileResponse>(`/drive/${accountId}/folders`, {
    method: "POST",
    body: JSON.stringify({ name, parentId }),
    signal,
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

export function setStarred(
  accountId: string,
  fileId: string,
  starred: boolean
) {
  return apiFetch<DriveFileResponse>(`${filePath(accountId, fileId)}/star`, {
    method: "PATCH",
    body: JSON.stringify({ starred }),
  });
}

export function permanentlyDeleteFile(accountId: string, fileId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    `${filePath(accountId, fileId)}/permanent`,
    {
      method: "DELETE",
    }
  );
}


export function emptyTrash() {
  return apiFetch<{ success: boolean; accounts: number; failed: number }>(
    "/drive/trash/empty",
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
  onRetry?: (attempt: number, delayMs: number, reason: string) => void;
  singleRequest?: boolean;
};

type UploadResponse = {
  status: number;
  body: string;
  range: string | null;
  retryAfter: string | null;
};

class UploadNetworkError extends Error {
  constructor() {
    super("The connection to Google Drive was interrupted");
    this.name = "UploadNetworkError";
  }
}

class RetryableUploadError extends Error {
  response: UploadResponse;

  constructor(response: UploadResponse) {
    super(responseMessage(response));
    this.name = "RetryableUploadError";
    this.response = response;
  }
}

class UploadSessionExpiredError extends Error {
  constructor(cause?: unknown) {
    super("The Google Drive upload session expired", { cause });
    this.name = "UploadSessionExpiredError";
  }
}

const CHUNK_UNIT = 256 * 1024;
const MIN_CHUNK_SIZE = 8 * 1024 * 1024;
const INITIAL_CHUNK_SIZE = 64 * 1024 * 1024;
const MAX_CHUNK_SIZE = 256 * 1024 * 1024;
const MAX_CHUNK_RETRIES = 6;
const MAX_SESSION_RETRIES = 4;

function abortError() {
  return new DOMException("Upload cancelled", "AbortError");
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function parseReceivedOffset(range: string | null) {
  const match = range?.match(/bytes=0-(\d+)/i);

  return match ? Number(match[1]) + 1 : null;
}

function retryAfterMs(value: string | null) {
  if (!value) {
    return 0;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : Math.max(0, timestamp - Date.now());
}

function backoffMs(attempt: number, retryAfter?: string | null) {
  const exponential = Math.min(2 ** Math.max(0, attempt - 1) * 1000, 30_000);
  const jitter = Math.random() * 750;

  return Math.max(retryAfterMs(retryAfter || null), exponential + jitter);
}

function wait(delayMs: number, signal?: AbortSignal) {
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
    }, delayMs);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function waitUntilOnline(signal?: AbortSignal) {
  if (typeof navigator === "undefined" || navigator.onLine !== false) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    function cleanup() {
      window.removeEventListener("online", handleOnline);
      signal?.removeEventListener("abort", handleAbort);
    }

    function handleOnline() {
      cleanup();
      resolve();
    }

    function handleAbort() {
      cleanup();
      reject(abortError());
    }

    window.addEventListener("online", handleOnline, { once: true });
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function isRetryableStatus(status: number, body = "") {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500 ||
    (status === 403 && /rate.?limit|userRateLimitExceeded/i.test(body))
  );
}

function alignedChunkSize(size: number) {
  const aligned = Math.floor(size / CHUNK_UNIT) * CHUNK_UNIT;

  return Math.min(MAX_CHUNK_SIZE, Math.max(MIN_CHUNK_SIZE, aligned));
}

function adaptChunkSize(current: number, bytes: number, elapsedMs: number) {
  if (elapsedMs <= 0 || bytes <= 0) {
    return current;
  }

  const bytesPerSecond = bytes / (elapsedMs / 1000);
  const target = bytesPerSecond * 6;
  const bounded = Math.min(current * 2, Math.max(current / 2, target));

  return alignedChunkSize(bounded);
}

function uploadChunkRequest(
  uploadUrl: string,
  chunk: Blob,
  start: number,
  total: number,
  contentType: string,
  options: UploadOptions
) {
  return new Promise<UploadResponse>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(abortError());
      return;
    }

    const request = new XMLHttpRequest();
    const end = start + chunk.size;

    function cleanup() {
      options.signal?.removeEventListener("abort", handleAbort);
    }

    function handleAbort() {
      request.abort();
    }

    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", contentType);
    request.setRequestHeader(
      "Content-Range",
      `bytes ${start}-${end - 1}/${total}`
    );

    request.upload.onprogress = (event) => {
      const uploaded = Math.min(start + event.loaded, end);
      const visibleProgress =
        end === total
          ? Math.max(start, Math.min(uploaded, total - 1))
          : uploaded;

      options.onProgress?.(visibleProgress, total);
    };

    request.onload = () => {
      cleanup();
      resolve({
        status: request.status,
        body: request.responseText,
        range: request.getResponseHeader("Range"),
        retryAfter: request.getResponseHeader("Retry-After"),
      });
    };

    request.onerror = () => {
      cleanup();
      reject(new UploadNetworkError());
    };

    request.onabort = () => {
      cleanup();
      reject(abortError());
    };

    options.signal?.addEventListener("abort", handleAbort, { once: true });
    request.send(chunk);
  });
}

function uploadWholeFileRequest(
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
      options.onProgress?.(Math.min(event.loaded, file.size - 1), file.size);
    };

    request.onload = () => {
      cleanup();
      resolve({
        status: request.status,
        body: request.responseText,
        range: request.getResponseHeader("Range"),
        retryAfter: request.getResponseHeader("Retry-After"),
      });
    };

    request.onerror = () => {
      cleanup();
      reject(new UploadNetworkError());
    };

    request.onabort = () => {
      cleanup();
      reject(abortError());
    };

    options.signal?.addEventListener("abort", handleAbort, { once: true });
    request.send(file);
  });
}

function uploadStatusRequest(
  uploadUrl: string,
  total: number,
  signal?: AbortSignal
) {
  return new Promise<UploadResponse>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const request = new XMLHttpRequest();

    function cleanup() {
      signal?.removeEventListener("abort", handleAbort);
    }

    function handleAbort() {
      request.abort();
    }

    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Range", `bytes */${total}`);

    request.onload = () => {
      cleanup();
      resolve({
        status: request.status,
        body: request.responseText,
        range: request.getResponseHeader("Range"),
        retryAfter: request.getResponseHeader("Retry-After"),
      });
    };

    request.onerror = () => {
      cleanup();
      reject(new UploadNetworkError());
    };

    request.onabort = () => {
      cleanup();
      reject(abortError());
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
    request.send();
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

async function verifyUploadedFile(
  accountId: string,
  fileId: string,
  options: UploadOptions,
  maxAttempts = 8
) {
  let lastError: unknown = new Error("Google Drive did not confirm the upload");

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await apiFetch<DriveFileResponse>(filePath(accountId, fileId), {
        signal: options.signal,
      });
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw error;
      }

      lastError = error;
      const retryable =
        !(error instanceof ApiError) ||
        error.status === 404 ||
        isRetryableStatus(error.status, error.message);

      if (!retryable) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(500 * 2 ** (attempt - 1), 4_000);

        options.onRetry?.(attempt, delay, "Confirming upload with Google Drive");
        await wait(delay, options.signal);
      }
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Google Drive did not confirm the upload: ${lastError.message}`
      : "Google Drive did not confirm the upload",
    { cause: lastError }
  );
}

async function completeUpload(
  response: UploadResponse,
  accountId: string,
  fileId: string,
  options: UploadOptions
) {
  try {
    return completedUpload(response);
  } catch {
    return verifyUploadedFile(accountId, fileId, options);
  }
}

function retryReason(error: unknown) {
  if (error instanceof UploadNetworkError) {
    return "Connection interrupted, checking uploaded data";
  }

  if (error instanceof RetryableUploadError) {
    return `Google Drive returned ${error.response.status}, retrying`;
  }

  return "Retrying upload";
}

async function createSession(
  accountId: string,
  folderId: string,
  file: File,
  options: UploadOptions
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_SESSION_RETRIES; attempt += 1) {
    try {
      return await apiFetch<UploadSessionResponse>(
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
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw error;
      }

      lastError = error;

      const retryable =
        !(error instanceof ApiError) ||
        isRetryableStatus(error.status, error.message);

      if (!retryable || attempt === MAX_SESSION_RETRIES) {
        throw error;
      }

      const delay = backoffMs(attempt);

      options.onRetry?.(attempt, delay, "Preparing Google Drive upload");
      await waitUntilOnline(options.signal);
      await wait(delay, options.signal);
    }
  }

  throw lastError;
}

async function uploadSession(
  session: UploadSessionResponse,
  accountId: string,
  file: File,
  options: UploadOptions
) {
  const contentType = file.type || "application/octet-stream";
  let offset = 0;
  let chunkSize = alignedChunkSize(
    Math.min(INITIAL_CHUNK_SIZE, Math.max(file.size, MIN_CHUNK_SIZE))
  );
  let retries = 0;

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const chunk = file.slice(offset, end);
    const startedAt = performance.now();

    try {
      const response = await uploadChunkRequest(
        session.uploadUrl,
        chunk,
        offset,
        file.size,
        contentType,
        options
      );

      if (response.status === 200 || response.status === 201) {
        const completed = await completeUpload(
          response,
          accountId,
          session.fileId,
          options
        );

        options.onProgress?.(file.size, file.size);
        return completed;
      }

      if (response.status === 308) {
        const received = parseReceivedOffset(response.range) ?? end;

        if (received <= offset) {
          throw new UploadNetworkError();
        }

        offset = Math.min(received, file.size);
        options.onProgress?.(offset, file.size);

        if (offset === file.size) {
          const completed = await verifyUploadedFile(
            accountId,
            session.fileId,
            options
          );

          options.onProgress?.(file.size, file.size);
          return completed;
        }

        chunkSize = adaptChunkSize(
          chunkSize,
          chunk.size,
          performance.now() - startedAt
        );
        retries = 0;
        continue;
      }

      if (response.status === 404) {
        throw new UploadSessionExpiredError();
      }

      if (isRetryableStatus(response.status, response.body)) {
        throw new RetryableUploadError(response);
      }

      throw new Error(responseMessage(response));
    } catch (error: unknown) {
      if (isAbortError(error) || error instanceof UploadSessionExpiredError) {
        throw error;
      }

      if (
        !(error instanceof UploadNetworkError) &&
        !(error instanceof RetryableUploadError)
      ) {
        throw error;
      }

      retries += 1;

      if (retries > MAX_CHUNK_RETRIES) {
        throw new Error(
          error instanceof Error
            ? `Upload failed after repeated retries: ${error.message}`
            : "Upload failed after repeated retries",
          { cause: error }
        );
      }

      chunkSize = alignedChunkSize(Math.max(MIN_CHUNK_SIZE, chunkSize / 2));

      const retryAfter =
        error instanceof RetryableUploadError
          ? error.response.retryAfter
          : null;
      const delay = backoffMs(retries, retryAfter);

      options.onRetry?.(retries, delay, retryReason(error));
      await waitUntilOnline(options.signal);
      await wait(delay, options.signal);

      let statusResponse: UploadResponse;

      try {
        statusResponse = await uploadStatusRequest(
          session.uploadUrl,
          file.size,
          options.signal
        );
      } catch (statusError: unknown) {
        if (isAbortError(statusError)) {
          throw statusError;
        }

        continue;
      }

      if (statusResponse.status === 200 || statusResponse.status === 201) {
        const completed = await completeUpload(
          statusResponse,
          accountId,
          session.fileId,
          options
        );

        options.onProgress?.(file.size, file.size);
        return completed;
      }

      if (statusResponse.status === 308) {
        offset = Math.min(
          parseReceivedOffset(statusResponse.range) ?? 0,
          file.size
        );
        options.onProgress?.(offset, file.size);

        if (offset === file.size) {
          const completed = await verifyUploadedFile(
            accountId,
            session.fileId,
            options
          );

          options.onProgress?.(file.size, file.size);
          return completed;
        }

        continue;
      }

      if (statusResponse.status === 404) {
        if (end === file.size) {
          try {
            const completed = await verifyUploadedFile(
              accountId,
              session.fileId,
              options,
              4
            );

            options.onProgress?.(file.size, file.size);
            return completed;
          } catch (verificationError: unknown) {
            if (isAbortError(verificationError)) {
              throw verificationError;
            }

            throw new UploadSessionExpiredError(verificationError);
          }
        }

        throw new UploadSessionExpiredError();
      }

      if (!isRetryableStatus(statusResponse.status, statusResponse.body)) {
        throw new Error(responseMessage(statusResponse), { cause: error });
      }
    }
  }

  throw new Error("Google Drive did not complete the upload");
}

async function uploadSingleRequestSession(
  session: UploadSessionResponse,
  accountId: string,
  file: File,
  options: UploadOptions
) {
  const contentType = file.type || "application/octet-stream";
  let offset = 0;
  let retries = 0;
  let useWholeFileRequest = true;

  while (offset < file.size) {
    try {
      const response = useWholeFileRequest
        ? await uploadWholeFileRequest(session.uploadUrl, file, options)
        : await uploadChunkRequest(
            session.uploadUrl,
            file.slice(offset),
            offset,
            file.size,
            contentType,
            options
          );

      useWholeFileRequest = false;

      if (response.status === 200 || response.status === 201) {
        const completed = await completeUpload(
          response,
          accountId,
          session.fileId,
          options
        );

        options.onProgress?.(file.size, file.size);
        return completed;
      }

      if (response.status === 308) {
        const received = parseReceivedOffset(response.range);

        if (received === null || received <= offset) {
          throw new UploadNetworkError();
        }

        offset = Math.min(received, file.size);
        options.onProgress?.(offset, file.size);
        retries = 0;
        continue;
      }

      if (response.status === 404) {
        throw new UploadSessionExpiredError();
      }

      if (isRetryableStatus(response.status, response.body)) {
        throw new RetryableUploadError(response);
      }

      throw new Error(responseMessage(response));
    } catch (error: unknown) {
      if (isAbortError(error) || error instanceof UploadSessionExpiredError) {
        throw error;
      }

      if (
        !(error instanceof UploadNetworkError) &&
        !(error instanceof RetryableUploadError)
      ) {
        throw error;
      }

      retries += 1;

      if (retries > MAX_CHUNK_RETRIES) {
        throw new Error(
          error instanceof Error
            ? `Upload failed after repeated retries: ${error.message}`
            : "Upload failed after repeated retries",
          { cause: error }
        );
      }

      const retryAfter =
        error instanceof RetryableUploadError
          ? error.response.retryAfter
          : null;
      const delay = backoffMs(retries, retryAfter);

      options.onRetry?.(retries, delay, retryReason(error));
      await waitUntilOnline(options.signal);
      await wait(delay, options.signal);

      let statusResponse: UploadResponse;

      try {
        statusResponse = await uploadStatusRequest(
          session.uploadUrl,
          file.size,
          options.signal
        );
      } catch (statusError: unknown) {
        if (isAbortError(statusError)) {
          throw statusError;
        }

        continue;
      }

      if (statusResponse.status === 200 || statusResponse.status === 201) {
        const completed = await completeUpload(
          statusResponse,
          accountId,
          session.fileId,
          options
        );

        options.onProgress?.(file.size, file.size);
        return completed;
      }

      if (statusResponse.status === 308) {
        offset = Math.min(
          parseReceivedOffset(statusResponse.range) ?? 0,
          file.size
        );
        options.onProgress?.(offset, file.size);
        useWholeFileRequest = offset === 0;
        continue;
      }

      if (statusResponse.status === 404) {
        try {
          const completed = await verifyUploadedFile(
            accountId,
            session.fileId,
            options,
            4
          );

          options.onProgress?.(file.size, file.size);
          return completed;
        } catch (verificationError: unknown) {
          if (isAbortError(verificationError)) {
            throw verificationError;
          }

          throw new UploadSessionExpiredError(verificationError);
        }
      }

      if (!isRetryableStatus(statusResponse.status, statusResponse.body)) {
        throw new Error(responseMessage(statusResponse), { cause: error });
      }
    }
  }

  const completed = await verifyUploadedFile(
    accountId,
    session.fileId,
    options
  );

  options.onProgress?.(file.size, file.size);
  return completed;
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

  options.onProgress?.(0, file.size);

  for (let restart = 0; restart < 2; restart += 1) {
    const session = await createSession(accountId, folderId, file, options);

    try {
      return options.singleRequest
        ? await uploadSingleRequestSession(session, accountId, file, options)
        : await uploadSession(session, accountId, file, options);
    } catch (error: unknown) {
      if (!(error instanceof UploadSessionExpiredError) || restart === 1) {
        throw error;
      }

      const delay = backoffMs(1);

      options.onProgress?.(0, file.size);
      options.onRetry?.(1, delay, "Restarting expired Google Drive session");
      await wait(delay, options.signal);
    }
  }

  throw new Error("Google Drive did not complete the upload");
}
