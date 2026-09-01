import {
  getAccounts,
  getStorageInfo,
  getDriveInfo,
  listFiles,
} from "../services/drive.service.js";

/**
 * accountId is optional on every Drive route.
 *
 * /api/drive/files             -> primary account (legacy behaviour)
 * /api/drive/:accountId/files  -> that specific account
 */
function accountIdFrom(req) {
  return req.params.accountId || null;
}

function fail(res, error) {
  console.error(error);

  const notFound =
    error.message === "Google account not found" ||
    error.message === "Invalid account id" ||
    error.message === "No Google account connected";

  return res.status(notFound ? 404 : 500).json({
    success: false,
    message: error.message,
  });
}

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
    const drive = await getDriveInfo(
      req.user._id,
      accountIdFrom(req)
    );

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
