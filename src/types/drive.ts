export interface DriveStorage {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
}

/** A Google account connected to the JoinDrive user. */
export interface DriveAccount {
  id: string;
  googleId: string;
  name: string;
  email: string;
  picture: string;
  isPrimary: boolean;
  connected: boolean;
  storage: DriveStorage | null;
}

/** What the signed in account is allowed to do with a file. */
export interface DriveCapabilities {
  canEdit?: boolean;
  canRename?: boolean;
  canDelete?: boolean;
  canCopy?: boolean;
  canShare?: boolean;
  canDownload?: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  parents?: string[];
  shared?: boolean;
  capabilities?: DriveCapabilities;
}

export const FOLDER_MIME = "application/vnd.google-apps.folder";

export function isFolder(file: DriveFile) {
  return file.mimeType === FOLDER_MIME;
}

/** A file cut or copied, waiting to be pasted. */
export interface Clipboard {
  mode: "copy" | "cut";
  file: DriveFile;
  accountId: string;
}

export type SortKey = "name" | "modified" | "size";
export type SortDirection = "asc" | "desc";
