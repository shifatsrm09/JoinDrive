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

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read the file"));

    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };

    reader.readAsDataURL(file);
  });
}

export async function uploadFile(
  accountId: string,
  folderId: string,
  file: File
) {
  const data = await readAsBase64(file);

  return apiFetch<DriveFileResponse>(`/drive/${accountId}/upload`, {
    method: "POST",
    body: JSON.stringify({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      folderId,
      data,
    }),
  });
}
