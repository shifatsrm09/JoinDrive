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
  createFolder,
  remove,
  restore,
  destroy,
  emptyTrash,
  copy,
  move,
  share,
  download,
  createUpload,
} from "../controllers/drive.controller.js";

const router = Router();

router.use(protect);

router.get("/accounts", listAccounts);
router.delete("/accounts/:accountId", removeAccount);

router.get("/info", getInfo);
router.get("/storage", getStorage);
router.get("/files", getFiles);


router.get("/aggregate", getAggregate);
router.get("/search", search);

// Empties the trash across every linked account.
router.post("/trash/empty", emptyTrash);

router.get("/:accountId/info", getInfo);
router.get("/:accountId/storage", getStorage);
router.get("/:accountId/files", getFiles);

router.get("/:accountId/files/:fileId", getFileDetails);
router.get("/:accountId/files/:fileId/download", download);
router.patch("/:accountId/files/:fileId/rename", rename);
router.post("/:accountId/files/:fileId/copy", copy);
router.post("/:accountId/files/:fileId/move", move);
router.post("/:accountId/files/:fileId/share", share);
router.post("/:accountId/files/:fileId/restore", restore);
router.delete("/:accountId/files/:fileId", remove);

// Permanent, non-recoverable delete (skips the trash entirely).
router.delete("/:accountId/files/:fileId/permanent", destroy);

router.post("/:accountId/upload", createUpload);

router.post("/:accountId/folders", createFolder);

export default router;
