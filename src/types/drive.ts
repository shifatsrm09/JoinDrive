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

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  iconLink?: string;
  thumbnailLink?: string;
}
