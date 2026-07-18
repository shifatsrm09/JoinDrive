import { Router } from "express";

import { protect } from "../middleware/protect.js";
import { getStorage } from "../controllers/drive.controller.js";

const router = Router();

router.get("/storage", protect, getStorage);

export default router;