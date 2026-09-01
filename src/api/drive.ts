import { apiFetch } from "./client";
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

/** Every Google account linked to the signed in JoinDrive user. */
export function getAccounts() {
  return apiFetch<DriveAccountsResponse>("/drive/accounts");
}

/**
 * Routes are account scoped when an accountId is given and fall back to
 * the primary account when it is not.
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
