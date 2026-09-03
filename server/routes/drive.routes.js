import { Router } from "express";

import { protect } from "../middleware/protect.js";

import {
  listAccounts,
  removeAccount,
  getStorage,
  getInfo,
  getFiles,
  getFileDetails,
  getAggregate,
  search,
  rename,
  remove,
  restore,
  copy,
  move,
  share,
  download,
  upload,
} from "../controllers/drive.controller.js";

const router = Router();

router.use(protect);

// All Google accounts linked to the authenticated JoinDrive User
router.get("/accounts", listAccounts);
router.delete("/accounts/:accountId", removeAccount);

// Primary account (kept so existing behaviour does not break)
router.get("/info", getInfo);
router.get("/storage", getStorage);
router.get("/files", getFiles);

// Cross-account views: Recent, Favorites, Trash, and search. These read
// from every linked account at once instead of a single Drive.
router.get("/aggregate", getAggregate);
router.get("/search", search);

// A specific linked account
router.get("/:accountId/info", getInfo);
router.get("/:accountId/storage", getStorage);
router.get("/:accountId/files", getFiles);

// File actions. accountId is required so a write can never be applied
// to the wrong Drive.
router.get("/:accountId/files/:fileId", getFileDetails);
router.get("/:accountId/files/:fileId/download", download);
router.patch("/:accountId/files/:fileId/rename", rename);
router.post("/:accountId/files/:fileId/copy", copy);
router.post("/:accountId/files/:fileId/move", move);
router.post("/:accountId/files/:fileId/share", share);
router.post("/:accountId/files/:fileId/restore", restore);
router.delete("/:accountId/files/:fileId", remove);

// Uploads a new file into a folder in that account.
router.post("/:accountId/upload", upload);

export default router;
