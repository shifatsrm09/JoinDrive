import { Router } from "express";

import { protect } from "../middleware/protect.js";

import {
  listAccounts,
  getStorage,
  getInfo,
  getFiles,
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

export default router;
