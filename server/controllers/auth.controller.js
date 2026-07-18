import oauth2Client from "../config/google.js";
import { google } from "googleapis";
import { generateToken } from "../utils/jwt.js";

import User from "../models/User.js";
import GoogleAccount from "../models/GoogleAccount.js";

export async function googleLogin(req, res) {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  res.redirect(url);
}

export async function googleCallback(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code not found",
      });
    }

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get Google profile
    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauth2Client,
    });

    const { data } = await oauth2.userinfo.get();

    // Check if this Google account already exists
    let account = await GoogleAccount.findOne({
      googleId: data.id,
    });

    if (account) {
      // Existing account
      account.name = data.name;
      account.email = data.email;
      account.picture = data.picture;
      if (tokens.access_token) {
        account.accessToken = tokens.access_token;
        }
      account.refreshToken =
        tokens.refresh_token || account.refreshToken;
      if (tokens.expiry_date) {
        account.expiryDate = tokens.expiry_date;
        }
      account.lastSynced = new Date();

      await account.save();
    } else {
      // First time login
      const user = await User.create({});

      account = await GoogleAccount.create({
        userId: user._id,
        googleId: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token || "",
        expiryDate: tokens.expiry_date,
      });
    }

    // Create JWT
    const token = generateToken(account.userId.toString());

    // Store JWT in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // Change to true in production with HTTPS
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Redirect back to React
    return res.redirect("http://localhost:5173/");

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
}

export async function getMe(req, res) {
  try {
    const accounts = await GoogleAccount.find({
      userId: req.user._id,
    }).select("-accessToken -refreshToken");

    return res.json({
      success: true,
      user: {
        id: req.user._id,
        accounts,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
}