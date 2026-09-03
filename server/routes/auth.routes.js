import { Router } from "express";

import {
  googleLogin,
  googleCallback,
  googleConnect,
  googleConnectCallback,
  getMe,
  logout,
  deleteAccount,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/protect.js";

const router = Router();

// Sign in to JoinDrive (primary account only)
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);

// Link an additional Google Drive to the signed in JoinDrive user
router.get("/google/connect", protect, googleConnect);
router.get("/google/connect/callback", googleConnectCallback);

router.get("/me", protect, getMe);
router.post("/logout", logout);

// Permanently deletes the JoinDrive account and frees every linked
// Google account (see deleteAccount for what that means).
router.delete("/me", protect, deleteAccount);

export default router;
