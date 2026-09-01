import mongoose from "mongoose";
import { google } from "googleapis";

import GoogleAccount from "../models/GoogleAccount.js";
import { getAuthenticatedClient } from "./google.service.js";

/**
 * Resolve which GoogleAccount a request should act on.
 *
 * Every lookup is scoped by userId, so one JoinDrive User can never
 * read another User's Drive by guessing an accountId.
 *
 * When no accountId is supplied the primary (first connected) account
 * is used, which keeps the original single-account routes working.
 */
async function resolveAccount(userId, accountId) {
  if (accountId) {
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      throw new Error("Invalid account id");
    }

    const account = await GoogleAccount.findOne({
      _id: accountId,
      userId,
    });

    if (!account) {
      throw new Error("Google account not found");
    }

    return account;
  }

  const account = await GoogleAccount.findOne({ userId }).sort({
    isPrimary: -1,
    createdAt: 1,
  });

  if (!account) {
    throw new Error("No Google account connected");
  }

  return account;
}

async function getDriveClient(account) {
  const auth = await getAuthenticatedClient(account._id);

  return google.drive({
    version: "v3",
    auth,
  });
}

function serializeAccount(account, storage, connected) {
  return {
    id: account._id,
    googleId: account.googleId,
    name: account.name,
    email: account.email,
    picture: account.picture,
    isPrimary: account.isPrimary,
    connected,
    storage: storage || null,
  };
}

/**
 * Every Google account linked to this JoinDrive User.
 *
 * Storage is fetched per account in parallel. A single broken account
 * (revoked access, expired refresh token) is reported as disconnected
 * instead of failing the whole dashboard.
 */
export async function getAccounts(userId) {
  const accounts = await GoogleAccount.find({ userId }).sort({
    isPrimary: -1,
    createdAt: 1,
  });

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const drive = await getDriveClient(account);

      const { data } = await drive.about.get({
        fields: "storageQuota",
      });

      return data.storageQuota;
    })
  );

  return accounts.map((account, index) => {
    const result = results[index];

    if (result.status === "fulfilled") {
      return serializeAccount(account, result.value, true);
    }

    console.error(
      `Failed to load storage for ${account.email}:`,
      result.reason?.message
    );

    return serializeAccount(account, null, false);
  });
}

export async function getStorageInfo(userId, accountId) {
  const account = await resolveAccount(userId, accountId);

  const drive = await getDriveClient(account);

  const { data } = await drive.about.get({
    fields: "storageQuota",
  });

  return data.storageQuota;
}

export async function getDriveInfo(userId, accountId) {
  const account = await resolveAccount(userId, accountId);

  const drive = await getDriveClient(account);

  const { data } = await drive.about.get({
    fields: "storageQuota",
  });

  return serializeAccount(account, data.storageQuota, true);
}

export async function listFiles(userId, accountId, folderId = "root") {
  const account = await resolveAccount(userId, accountId);

  const drive = await getDriveClient(account);

  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields:
      "files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink)",
    orderBy: "folder,name",
    pageSize: 100,
  });

  return data.files;
}
