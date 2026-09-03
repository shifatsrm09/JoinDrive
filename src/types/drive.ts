export interface DriveStorage {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
}

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

export interface DriveCapabilities {
  canEdit?: boolean;
  canRename?: boolean;
  canDelete?: boolean;
  canCopy?: boolean;
  canShare?: boolean;
  canDownload?: boolean;
}

export interface DriveOwner {
  displayName?: string;
  emailAddress?: string;
  me?: boolean;
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
  owners?: DriveOwner[];
  capabilities?: DriveCapabilities;
}

export const FOLDER_MIME = "application/vnd.google-apps.folder";

export function isFolder(file: DriveFile) {
  return file.mimeType === FOLDER_MIME;
}

export interface Clipboard {
  mode: "copy" | "cut";
  file: DriveFile;
  accountId: string;
}

export type SortKey = "name" | "modified" | "size";
export type SortDirection = "asc" | "desc";
