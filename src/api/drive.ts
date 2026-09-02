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

/** A file returned by a cross-account view, tagged with its source Drive. */
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

/** Every Google account linked to the signed in JoinDrive user. */
export function getAccounts() {
  return apiFetch<DriveAccountsResponse>("/drive/accounts");
}

/**
 * Read routes are account scoped when an accountId is given and fall
 * back to the primary account when it is not.
 */
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

/** Recent, Favorites, or Trash, merged across every linked account. */
export function getAggregate(view: AggregateView) {
  return apiFetch<AggregateResponse>(
    `/drive/aggregate?view=${encodeURIComponent(view)}`
  );
}

/** Filename search across every linked account. */
export function searchFiles(query: string) {
  return apiFetch<SearchResponse>(
    `/drive/search?q=${encodeURIComponent(query)}`
  );
}

/* ------------------------------------------------------------------ */
/* File actions. These always target one explicit account.             */
/* ------------------------------------------------------------------ */

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

/** Moves the file to the Drive trash. It is recoverable from Drive. */
export function deleteFile(accountId: string, fileId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    filePath(accountId, fileId),
    {
      method: "DELETE",
    }
  );
}

/** Restores a file out of the Drive trash. */
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

/**
 * Downloads run as a normal top level navigation rather than fetch, so
 * the browser handles the save dialog and the session cookie is sent.
 */
export function downloadUrl(accountId: string, fileId: string) {
  return `${API_BASE_URL}${filePath(accountId, fileId)}/download`;
}
