import {
  getAccounts,
  getStorageInfo,
  getDriveInfo,
  listFiles,
  getFile,
  disconnectAccount,
  renameFile,
  createFolder as createFolderInDrive,
  trashFile,
  copyFile,
  moveFile,
  shareFile,
  downloadFile,
  uploadFile,
  listAggregated,
  searchFiles,
  restoreFile,
} from "../services/drive.service.js";

/**
 * accountId is optional on the read routes.
 *
 * /api/drive/files             -> primary account (legacy behaviour)
 * /api/drive/:accountId/files  -> that specific account
 *
 * Mutations always require an explicit accountId so a write can never
 * land on the wrong Drive.
 */
function accountIdFrom(req) {
  return req.params.accountId || null;
}

const MAX_UPLOAD_MB = 25;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const NOT_FOUND_ERRORS = new Set([
  "Google account not found",
  "Invalid account id",
  "No Google account connected",
]);

const BAD_REQUEST_ERRORS = new Set([
  "Name cannot be empty",
  "Folders cannot be copied",
  "Folders cannot be downloaded",
  "This Google file type cannot be downloaded",
  "Unsupported share type",
  "Unsupported share role",
  "An email address is required",
  "Unsupported view",
  "A file name is required",
  "The file appears to be empty",
  "A file (data) is required",
  `Files larger than ${MAX_UPLOAD_MB}MB are not supported yet`,
]);

function fail(res, error) {
  console.error(error);

  if (res.headersSent) {
    return res.end();
  }

  let status = 500;

  if (NOT_FOUND_ERRORS.has(error.message)) {
    status = 404;
  } else if (BAD_REQUEST_ERRORS.has(error.message)) {
    status = 400;
  } else if (error.code === 403 || error.code === 404) {
    // Propagate Google's own permission / missing file answers.
    status = error.code;
  }

  return res.status(status).json({
    success: false,
    message: error.message,
  });
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function listAccounts(req, res) {
  try {
    const accounts = await getAccounts(req.user._id);

    return res.json({
      success: true,
      accounts,
    });
  } catch (error) {
    return fail(res, error);
  }
}

/** Unlinks a Google account. Only the JoinDrive record is removed. */
export async function removeAccount(req, res) {
  try {
    const result = await disconnectAccount(
      req.user._id,
      req.params.accountId
    );

    return res.json({
      success: true,
      ...result,
      message: "Drive disconnected",
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function getStorage(req, res) {
  try {
    const storage = await getStorageInfo(
      req.user._id,
      accountIdFrom(req)
    );

    return res.json({
      success: true,
      storage,
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function getInfo(req, res) {
  try {
    const drive = await getDriveInfo(req.user._id, accountIdFrom(req));

    return res.json({
      success: true,
      drive,
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function getFiles(req, res) {
  try {
    const folderId = req.query.folderId || "root";

    const files = await listFiles(
      req.user._id,
      accountIdFrom(req),
      folderId
    );

    return res.json({
      success: true,
      accountId: accountIdFrom(req),
      currentFolder: folderId,
      files,
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function getFileDetails(req, res) {
  try {
    const file = await getFile(
      req.user._id,
      accountIdFrom(req),
      req.params.fileId
    );

    return res.json({
      success: true,
      file,
    });
  } catch (error) {
    return fail(res, error);
  }
}

/**
 * Recent / Favorites / Trash. These read across every linked account
 * at once, unlike the rest of the read routes which are per account.
 */
export async function getAggregate(req, res) {
  try {
    const view = req.query.view;

    const files = await listAggregated(req.user._id, view);

    return res.json({
      success: true,
      view,
      files,
    });
  } catch (error) {
    return fail(res, error);
  }
}

/** Filename search across every linked account. */
export async function search(req, res) {
  try {
    const files = await searchFiles(req.user._id, req.query.q);

    return res.json({
      success: true,
      query: req.query.q || "",
      files,
    });
  } catch (error) {
    return fail(res, error);
  }
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export async function rename(req, res) {
  try {
    const file = await renameFile(
      req.user._id,
      accountIdFrom(req),
      req.params.fileId,
      req.body?.name
    );

    return res.json({
      success: true,
      file,
    });
  } catch (error) {
    return fail(res, error);
  }
}

/** Creates a new, empty folder inside a parent folder. */
export async function createFolder(req, res) {
  try {
    const file = await createFolderInDrive(
      req.user._id,
      accountIdFrom(req),
      req.body?.parentId || "root",
      req.body?.name
    );

    return res.json({
      success: true,
      file,
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function remove(req, res) {
  try {
    const file = await trashFile(
      req.user._id,
      accountIdFrom(req),
      req.params.fileId
    );

    return res.json({
      success: true,
      file,
      message: "Moved to trash",
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function restore(req, res) {
  try {
    const file = await restoreFile(
      req.user._id,
      accountIdFrom(req),
      req.params.fileId
    );

    return res.json({
      success: true,
      file,
      message: "Restored from trash",
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function copy(req, res) {
  try {
    const file = await copyFile(
      req.user._id,
      accountIdFrom(req),
      req.params.fileId,
      req.body?.targetFolderId || "root"
    );

    return res.json({
      success: true,
      file,
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function move(req, res) {
  try {
    const file = await moveFile(
      req.user._id,
      accountIdFrom(req),
      req.params.fileId,
      req.body?.targetFolderId || "root"
    );

    return res.json({
      success: true,
      file,
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function share(req, res) {
  try {
    const file = await shareFile(
      req.user._id,
      accountIdFrom(req),
      req.params.fileId,
      {
        type: req.body?.type,
        role: req.body?.role,
        email: req.body?.email,
      }
    );

    return res.json({
      success: true,
      file,
    });
  } catch (error) {
    return fail(res, error);
  }
}

export async function download(req, res) {
  try {
    const { stream, filename, mimeType, size } = await downloadFile(
      req.user._id,
      accountIdFrom(req),
      req.params.fileId
    );

    res.setHeader("Content-Type", mimeType);

    if (size) {
      res.setHeader("Content-Length", size);
    }

    // encodeURIComponent keeps non-ASCII names intact in the header.
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );

    stream.on("error", (error) => {
      console.error("Download stream failed", error);
      res.destroy(error);
    });

    stream.pipe(res);
  } catch (error) {
    return fail(res, error);
  }
}

/**
 * The client base64 encodes the file into the JSON body (see
 * express.json's raised limit in app.js) rather than a multipart
 * upload, so no extra middleware is needed on the server.
 */
export async function upload(req, res) {
  try {
    const { name, mimeType, data, folderId } = req.body || {};

    if (!data) {
      throw new Error("A file (data) is required");
    }

    const buffer = Buffer.from(data, "base64");

    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new Error(
        `Files larger than ${MAX_UPLOAD_MB}MB are not supported yet`
      );
    }

    const file = await uploadFile(
      req.user._id,
      accountIdFrom(req),
      folderId || "root",
      { name, mimeType, buffer }
    );

    return res.json({
      success: true,
      file,
    });
  } catch (error) {
    return fail(res, error);
  }
}
