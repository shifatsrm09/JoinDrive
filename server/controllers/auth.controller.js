import crypto from "crypto";
import jwt from "jsonwebtoken";
import { google } from "googleapis";

import {
  createLoginClient,
  createConnectClient,
} from "../config/google.js";

import { generateToken } from "../utils/jwt.js";

import User from "../models/User.js";
import GoogleAccount from "../models/GoogleAccount.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive",
];

const STATE_COOKIE = "oauth_state";
const LOGIN_STATE_COOKIE = "login_oauth_state";

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: false, // set to true in production behind HTTPS
    sameSite: "lax",
    maxAge,
  };
}

function redirectToClient(res, path, params) {
  const url = new URL(path, CLIENT_URL);

  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return res.redirect(url.toString());
}

async function fetchGoogleProfile(client) {
  const oauth2 = google.oauth2({
    version: "v2",
    auth: client,
  });

  const { data } = await oauth2.userinfo.get();

  return data;
}

function applyTokens(account, tokens) {
  if (tokens.access_token) {
    account.accessToken = tokens.access_token;
  }

  // Google only returns a refresh token on the first consent,
  // so never overwrite a stored one with undefined.
  if (tokens.refresh_token) {
    account.refreshToken = tokens.refresh_token;
  }

  if (tokens.expiry_date) {
    account.expiryDate = tokens.expiry_date;
  }

  account.lastSynced = new Date();
}

/* ------------------------------------------------------------------ */
/* Login: creates or signs into a JoinDrive User                        */
/* ------------------------------------------------------------------ */

export async function googleLogin(req, res) {
  // Same CSRF protection as the account-linking flow below: without
  // this, an attacker could start their own OAuth flow, capture the
  // resulting `code`, and trick a victim into visiting the callback
  // URL with it — logging the victim into the attacker's JoinDrive
  // account. A nonce that only this browser has stops that.
  const nonce = crypto.randomBytes(16).toString("hex");

  const state = jwt.sign({ nonce }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });

  res.cookie(LOGIN_STATE_COOKIE, nonce, cookieOptions(10 * 60 * 1000));

  const client = createLoginClient();

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });

  res.redirect(url);
}

export async function googleCallback(req, res) {
  try {
    const { code, state } = req.query;

    if (!code) {
      return redirectToClient(res, "/", {
        error: "missing_code",
      });
    }

    const nonce = req.cookies[LOGIN_STATE_COOKIE];

    res.clearCookie(LOGIN_STATE_COOKIE, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    let stateOk = false;

    if (state && nonce) {
      try {
        const decodedState = jwt.verify(state, process.env.JWT_SECRET);
        stateOk = decodedState.nonce === nonce;
      } catch {
        stateOk = false;
      }
    }

    if (!stateOk) {
      return redirectToClient(res, "/", {
        error: "invalid_state",
      });
    }

    const client = createLoginClient();

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const profile = await fetchGoogleProfile(client);

    let account = await GoogleAccount.findOne({
      googleId: profile.id,
    });

    if (account) {
      if (!account.isPrimary) {
        // Accounts created before isPrimary existed have no flag yet.
        // If this User has no primary at all, this is the original
        // login account, so adopt it as primary.
        const existingPrimary = await GoogleAccount.findOne({
          userId: account.userId,
          isPrimary: true,
        });

        if (existingPrimary) {
          // This Google account was added as an extra Drive.
          // JoinDrive is only entered through the primary account.
          return redirectToClient(res, "/", {
            error: "secondary_account",
            email: profile.email,
          });
        }

        account.isPrimary = true;
      }

      account.name = profile.name;
      account.email = profile.email;
      account.picture = profile.picture;

      applyTokens(account, tokens);

      await account.save();
    } else {
      const user = await User.create({});

      account = await GoogleAccount.create({
        userId: user._id,
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token || "",
        expiryDate: tokens.expiry_date,
        isPrimary: true,
      });
    }

    const token = generateToken(account.userId.toString());

    res.cookie("token", token, cookieOptions(30 * 24 * 60 * 60 * 1000));

    return redirectToClient(res, "/explorer");
  } catch (error) {
    console.error(error);

    return redirectToClient(res, "/", {
      error: "login_failed",
    });
  }
}

/* ------------------------------------------------------------------ */
/* Connect: links another Google account to the SAME JoinDrive User     */
/* ------------------------------------------------------------------ */

/**
 * Runs behind `protect`, so req.user is the already authenticated
 * JoinDrive User.
 *
 * The User id travels to Google inside a signed `state` value, and a
 * matching nonce is stored in a short lived cookie. The callback trusts
 * the state only when both agree, which prevents another site from
 * driving the link flow and guarantees the new Drive is attached to the
 * account that actually started it.
 */
export async function googleConnect(req, res) {
  const nonce = crypto.randomBytes(16).toString("hex");

  const state = jwt.sign(
    {
      userId: req.user._id.toString(),
      nonce,
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  res.cookie(STATE_COOKIE, nonce, cookieOptions(10 * 60 * 1000));

  const client = createConnectClient();

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent select_account",
    scope: SCOPES,
    state,
  });

  res.redirect(url);
}

export async function googleConnectCallback(req, res) {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return redirectToClient(res, "/explorer", {
        error: "connect_cancelled",
      });
    }

    const nonce = req.cookies[STATE_COOKIE];

    res.clearCookie(STATE_COOKIE, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    let decoded;

    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      return redirectToClient(res, "/explorer", {
        error: "invalid_state",
      });
    }

    if (!nonce || decoded.nonce !== nonce) {
      return redirectToClient(res, "/explorer", {
        error: "invalid_state",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return redirectToClient(res, "/", {
        error: "session_expired",
      });
    }

    const client = createConnectClient();

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const profile = await fetchGoogleProfile(client);

    const existing = await GoogleAccount.findOne({
      googleId: profile.id,
    });

    if (existing) {
      if (existing.userId.toString() !== user._id.toString()) {
        if (existing.isPrimary) {
          // It's the primary (sign-in) account for a different
          // JoinDrive user entirely. Linking it here would leave that
          // other JoinDrive account's owner locked out of ever using
          // it to sign in again, so this can only be resolved by
          // deleting that JoinDrive account first, freeing it up.
          return redirectToClient(res, "/explorer", {
            error: "linked_as_primary_elsewhere",
            email: profile.email,
          });
        }

        // Already linked as a secondary Drive on a different JoinDrive
        // account. Must be disconnected there before it can move here.
        return redirectToClient(res, "/explorer", {
          error: "already_linked",
          email: profile.email,
        });
      }

      // Same user reconnecting an account they already have:
      // refresh its tokens instead of creating a duplicate card.
      existing.name = profile.name;
      existing.email = profile.email;
      existing.picture = profile.picture;

      applyTokens(existing, tokens);

      await existing.save();

      return redirectToClient(res, "/explorer", {
        connected: existing.isPrimary ? "primary_reconnected" : "updated",
        email: profile.email,
      });
    }

    await GoogleAccount.create({
      userId: user._id,
      googleId: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      accessToken: tokens.access_token || "",
      refreshToken: tokens.refresh_token || "",
      expiryDate: tokens.expiry_date,
      isPrimary: false,
    });

    // The JoinDrive session is untouched: no new User, no new JWT.
    return redirectToClient(res, "/explorer", {
      connected: "success",
      email: profile.email,
    });
  } catch (error) {
    console.error(error);

    return redirectToClient(res, "/explorer", {
      error: "connect_failed",
    });
  }
}

/* ------------------------------------------------------------------ */
/* Session                                                              */
/* ------------------------------------------------------------------ */

export async function getMe(req, res) {
  try {
    const accounts = await GoogleAccount.find({
      userId: req.user._id,
    })
      .select("-accessToken -refreshToken")
      .sort({ isPrimary: -1, createdAt: 1 });

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

export async function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
}

/**
 * Permanently deletes the JoinDrive account: the User document and
 * every GoogleAccount linked to it. This is what "frees" those Google
 * accounts back up, so any of them (including the former primary) can
 * be used to sign up fresh or be linked to a different JoinDrive user
 * afterwards. Google Drive itself, and the files in it, are untouched
 * — this only deletes JoinDrive's own records.
 */
export async function deleteAccount(req, res) {
  try {
    await GoogleAccount.deleteMany({ userId: req.user._id });
    await User.findByIdAndDelete(req.user._id);

    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.json({
      success: true,
      message: "JoinDrive account deleted",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
}
