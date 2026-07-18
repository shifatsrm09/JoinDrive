import oauth2Client from "../config/google.js";
import { google } from "googleapis";

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

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauth2Client,
    });

    const { data } = await oauth2.userinfo.get();

    return res.json({
      success: true,
      user: data,
      tokens,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
}