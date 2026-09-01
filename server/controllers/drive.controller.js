import {
  getAccounts,
  getStorageInfo,
  getDriveInfo,
  listFiles,
  getFile,
  renameFile,
  trashFile,
  copyFile,
  moveFile,
  shareFile,
  downloadFile,
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
