import { Router } from "express";

import {
  googleLogin,
  googleCallback,
  getMe,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/protect.js";

const router = Router();

router.get("/google", googleLogin);

router.get("/google/callback", googleCallback);

router.get("/me", protect, getMe);

export default router;