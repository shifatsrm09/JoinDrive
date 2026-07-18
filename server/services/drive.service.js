import { google } from "googleapis";

import GoogleAccount from "../models/GoogleAccount.js";
import { getAuthenticatedClient } from "./google.service.js";

async function getDriveClient(userId) {
  const account = await GoogleAccount.findOne({
    userId,
  });

  if (!account) {
    throw new Error("No Google account connected");
  }

  const auth = await getAuthenticatedClient(account._id);

  return google.drive({
    version: "v3",
    auth,
  });
}

export async function getStorageInfo(userId) {
  const drive = await getDriveClient(userId);

  const { data } = await drive.about.get({
    fields: "storageQuota",
  });

  return data.storageQuota;
}

export async function getDriveInfo(userId) {
  const account = await GoogleAccount.findOne({
    userId,
  });

  if (!account) {
    throw new Error("No Google account connected");
  }

  const drive = await getDriveClient(userId);

  const { data } = await drive.about.get({
    fields: "storageQuota",
  });

  return {
    id: account._id,
    googleId: account.googleId,
    name: account.name,
    email: account.email,
    picture: account.picture,
    connected: true,
    storage: data.storageQuota,
  };
}

export async function listFiles(userId, folderId = "root") {
  const drive = await getDriveClient(userId);

  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields:
      "files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink)",
    orderBy: "folder,name",
    pageSize: 100,
  });

  return data.files;
}