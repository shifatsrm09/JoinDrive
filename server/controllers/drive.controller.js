import {
  getStorageInfo,
  listFiles,
} from "../services/drive.service.js";

export async function getStorage(req, res) {
  try {
    const storage = await getStorageInfo(req.user._id);

    return res.json({
      success: true,
      storage,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getFiles(req, res) {
  try {
    const folderId = req.query.folderId || "root";

    const files = await listFiles(req.user._id, folderId);

    return res.json({
      success: true,
      currentFolder: folderId,
      files,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}