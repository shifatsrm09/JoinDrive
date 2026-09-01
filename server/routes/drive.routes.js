import { Router } from "express";

import { protect } from "../middleware/protect.js";

import {
  listAccounts,
  getStorage,
  getInfo,
  getFiles,
  getFileDetails,
  rename,
  remove,
  copy,
  move,
  share,
  download,
} from "../controllers/drive.controller.js";

const router = Router();

router.use(protect);

// All Google accounts linked to the authenticated JoinDrive User
router.get("/accounts", listAccounts);

// Primary account (kept so existing behaviour does not break)
router.get("/info", getInfo);
router.get("/storage", getStorage);
router.get("/files", getFiles);

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
router.delete("/:accountId/files/:fileId", remove);

export default router;
