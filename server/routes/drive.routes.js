import { Router } from "express";

import { protect } from "../middleware/protect.js";

import {
  getStorage,
  getFiles,
} from "../controllers/drive.controller.js";

const router = Router();

router.get("/storage", protect, getStorage);

router.get("/files", protect, getFiles);

export default router;