import { Router } from "express";

import {
  googleLogin,
  googleCallback,
  getMe,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/protect.js";
import { logout } from "../controllers/auth.controller.js";

const router = Router();

router.get("/google", googleLogin);

router.get("/google/callback", googleCallback);

router.get("/me", protect, getMe);

router.post("/logout", logout);

export default router;