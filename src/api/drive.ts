import { apiFetch } from "./client";

export interface DriveInfoResponse {
  success: boolean;
  drive: {
    id: string;
    googleId: string;
    name: string;
    email: string;
    picture: string;
    connected: boolean;
    storage: {
      limit: string;
      usage: string;
      usageInDrive: string;
      usageInDriveTrash: string;
    };
  };
}

export interface DriveFilesResponse {
  success: boolean;
  currentFolder: string;
  files: {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime: string;
    iconLink?: string;
    thumbnailLink?: string;
  }[];
}

export function getDriveInfo() {
  return apiFetch<DriveInfoResponse>("/drive/info");
}

export function getFiles(folderId = "root") {
  return apiFetch<DriveFilesResponse>(
    `/drive/files?folderId=${folderId}`
  );
}