import mongoose from "mongoose";
import { Readable } from "node:stream";
import { google } from "googleapis";

import GoogleAccount from "../models/GoogleAccount.js";
import { getAuthenticatedClient } from "./google.service.js";

const FILE_FIELDS =
  "id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,parents,shared,owners(displayName,emailAddress,me),capabilities(canEdit,canRename,canDelete,canCopy,canShare,canDownload)";


const EXPORT_FORMATS = {
  "application/vnd.google-apps.document": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: "pptx",
  },
  "application/vnd.google-apps.drawing": {
    mimeType: "image/png",
    extension: "png",
  },
};

export const FOLDER_MIME = "application/vnd.google-apps.folder";


function escapeQueryValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}


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

async function driveFor(userId, accountId) {
  const account = await resolveAccount(userId, accountId);

  return getDriveClient(account);
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
  const drive = await driveFor(userId, accountId);

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
  const drive = await driveFor(userId, accountId);

  const { data } = await drive.files.list({
    q: `'${escapeQueryValue(folderId)}' in parents and trashed=false`,
    fields: `files(${FILE_FIELDS})`,
    orderBy: "folder,name",
    pageSize: 200,
  });

  return data.files;
}

export async function getFile(userId, accountId, fileId) {
  const drive = await driveFor(userId, accountId);

  const { data } = await drive.files.get({
    fileId,
    fields: FILE_FIELDS,
  });

  return data;
}

export async function disconnectAccount(userId, accountId) {
  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    throw new Error("Invalid account id");
  }

  const account = await GoogleAccount.findOneAndDelete({
    _id: accountId,
    userId,
  });

  if (!account) {
    throw new Error("Google account not found");
  }

  return { id: account._id, email: account.email };
}

const AGGREGATE_QUERIES = {
  recent: {
    q: "trashed = false",
    orderBy: "modifiedTime desc",
    pageSize: 30,
  },
  starred: {
    q: "starred = true and trashed = false",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  },
  trash: {
    q: "trashed = true",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  },
};


async function listAcrossAccounts(userId, driveListParams) {
  const accounts = await GoogleAccount.find({ userId }).sort({
    isPrimary: -1,
    createdAt: 1,
  });

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const drive = await getDriveClient(account);

      const { data } = await drive.files.list({
        ...driveListParams,
        fields: `files(${FILE_FIELDS})`,
      });

      return (data.files || []).map((file) => ({
        ...file,
        accountId: String(account._id),
        accountEmail: account.email,
      }));
    })
  );

  const files = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);

  files.sort(
    (a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime)
  );

  return files;
}

export async function listAggregated(userId, view) {
  const config = AGGREGATE_QUERIES[view];

  if (!config) {
    throw new Error("Unsupported view");
  }

  return listAcrossAccounts(userId, {
    q: config.q,
    orderBy: config.orderBy,
    pageSize: config.pageSize,
  });
}

export async function searchFiles(userId, term) {
  const trimmed = String(term || "").trim();

  if (!trimmed) {
    return [];
  }

  return listAcrossAccounts(userId, {
    q: `name contains '${escapeQueryValue(trimmed)}' and trashed = false`,
    orderBy: "modifiedTime desc",
    pageSize: 25,
  });
}

export async function restoreFile(userId, accountId, fileId) {
  const drive = await driveFor(userId, accountId);

  const { data } = await drive.files.update({
    fileId,
    requestBody: { trashed: false },
    fields: FILE_FIELDS,
  });

  return data;
}


export async function renameFile(userId, accountId, fileId, name) {
  const trimmed = String(name || "").trim();

  if (!trimmed) {
    throw new Error("Name cannot be empty");
  }

  const drive = await driveFor(userId, accountId);

  const { data } = await drive.files.update({
    fileId,
    requestBody: { name: trimmed },
    fields: FILE_FIELDS,
  });

  return data;
}

export async function createFolder(
  userId,
  accountId,
  parentId = "root",
  name
) {
  const trimmed = String(name || "").trim();

  if (!trimmed) {
    throw new Error("Name cannot be empty");
  }

  const drive = await driveFor(userId, accountId);

  const { data } = await drive.files.create({
    requestBody: {
      name: trimmed,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: FILE_FIELDS,
  });

  return data;
}


export async function trashFile(userId, accountId, fileId) {
  const drive = await driveFor(userId, accountId);

  const { data } = await drive.files.update({
    fileId,
    requestBody: { trashed: true },
    fields: "id,name,trashed",
  });

  return data;
}

export async function copyFile(
  userId,
  accountId,
  fileId,
  targetFolderId = "root"
) {
  const drive = await driveFor(userId, accountId);

  const source = await drive.files.get({
    fileId,
    fields: "id,name,mimeType",
  });

  if (source.data.mimeType === FOLDER_MIME) {
    // The Drive API cannot copy a folder in one call.
    throw new Error("Folders cannot be copied");
  }

  const { data } = await drive.files.copy({
    fileId,
    requestBody: {
      name: source.data.name,
      parents: [targetFolderId],
    },
    fields: FILE_FIELDS,
  });

  return data;
}

export async function moveFile(
  userId,
  accountId,
  fileId,
  targetFolderId = "root"
) {
  const drive = await driveFor(userId, accountId);

  const current = await drive.files.get({
    fileId,
    fields: "id,parents",
  });

  const previousParents = (current.data.parents || []).join(",");

  const { data } = await drive.files.update({
    fileId,
    addParents: targetFolderId,
    removeParents: previousParents || undefined,
    fields: FILE_FIELDS,
  });

  return data;
}


export async function shareFile(userId, accountId, fileId, options = {}) {
  const { type = "anyone", role = "reader", email } = options;

  if (!["anyone", "user"].includes(type)) {
    throw new Error("Unsupported share type");
  }

  if (!["reader", "writer", "commenter"].includes(role)) {
    throw new Error("Unsupported share role");
  }

  if (type === "user" && !email) {
    throw new Error("An email address is required");
  }

  const drive = await driveFor(userId, accountId);

  const requestBody = { type, role };

  if (type === "user") {
    requestBody.emailAddress = email;
  }

  await drive.permissions.create({
    fileId,
    requestBody,
    sendNotificationEmail: false,
  });

  const { data } = await drive.files.get({
    fileId,
    fields: "id,name,webViewLink,shared",
  });

  return data;
}


export async function downloadFile(userId, accountId, fileId) {
  const drive = await driveFor(userId, accountId);

  const meta = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,size",
  });

  const { name, mimeType, size } = meta.data;

  if (mimeType === FOLDER_MIME) {
    throw new Error("Folders cannot be downloaded");
  }

  const exportFormat = EXPORT_FORMATS[mimeType];

  if (mimeType.startsWith("application/vnd.google-apps.")) {
    if (!exportFormat) {
      throw new Error("This Google file type cannot be downloaded");
    }

    const response = await drive.files.export(
      {
        fileId,
        mimeType: exportFormat.mimeType,
      },
      { responseType: "stream" }
    );

    return {
      stream: response.data,
      filename: `${name}.${exportFormat.extension}`,
      mimeType: exportFormat.mimeType,
      size: null,
    };
  }

  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    { responseType: "stream" }
  );

  return {
    stream: response.data,
    filename: name,
    mimeType: mimeType || "application/octet-stream",
    size: size || null,
  };
}


export async function uploadFile(
  userId,
  accountId,
  folderId = "root",
  { name, mimeType, buffer }
) {
  const trimmed = String(name || "").trim();

  if (!trimmed) {
    throw new Error("A file name is required");
  }

  if (!buffer || buffer.length === 0) {
    throw new Error("The file appears to be empty");
  }

  const drive = await driveFor(userId, accountId);

  const { data } = await drive.files.create({
    requestBody: {
      name: trimmed,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || "application/octet-stream",
      body: Readable.from(buffer),
    },
    fields: FILE_FIELDS,
  });

  return data;
}
