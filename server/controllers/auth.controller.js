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

function finishOAuth(res, path, params, isPopup) {
  if (!isPopup) {
    return redirectToClient(res, path, params);
  }

  const destination = new URL(path, CLIENT_URL);

  Object.entries(params || {}).forEach(([key, value]) => {
    destination.searchParams.set(key, value);
  });


  const target = JSON.stringify(destination.toString()).replace(
    /</g,
    "\\u003c"
  );

  return res.type("html").send(`<!doctype html>
<html><head><title>JoinDrive</title></head><body>
<script>
  if (window.opener) {
    window.opener.location.replace(${target});
    window.close();
  } else {
    window.location.replace(${target});
  }
</script>
<p>Finishing sign-in…</p>
</body></html>`);
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


  if (tokens.refresh_token) {
    account.refreshToken = tokens.refresh_token;
  }

  if (tokens.expiry_date) {
    account.expiryDate = tokens.expiry_date;
  }

  account.lastSynced = new Date();
}


export async function googleLogin(req, res) {

  const nonce = crypto.randomBytes(16).toString("hex");

  const state = jwt.sign({
    nonce,
    popup: req.query.popup === "1",
  }, process.env.JWT_SECRET, {
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
  let decodedState;

  try {
    const { code, state } = req.query;

    const nonce = req.cookies[LOGIN_STATE_COOKIE];

    res.clearCookie(LOGIN_STATE_COOKIE, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    let stateOk = false;

    if (state && nonce) {
      try {
        decodedState = jwt.verify(state, process.env.JWT_SECRET);
        stateOk = decodedState.nonce === nonce;
      } catch {
        stateOk = false;
      }
    }

    if (!code) {
      return finishOAuth(res, "/", {
        error: "missing_code",
      }, decodedState?.popup === true);
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

        const existingPrimary = await GoogleAccount.findOne({
          userId: account.userId,
          isPrimary: true,
        });

        if (existingPrimary) {
          return finishOAuth(res, "/", {
            error: "secondary_account",
            email: profile.email,
          }, decodedState.popup === true);
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

    return finishOAuth(res, "/explorer", null, decodedState.popup === true);
  } catch (error) {
    console.error(error);

    return finishOAuth(res, "/", {
      error: "login_failed",
    }, decodedState?.popup === true);
  }
}

export async function googleConnect(req, res) {
  const nonce = crypto.randomBytes(16).toString("hex");

  const state = jwt.sign(
    {
      userId: req.user._id.toString(),
      nonce,
      popup: req.query.popup === "1",
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
  let decoded;

  try {
    const { code, state } = req.query;

    const nonce = req.cookies[STATE_COOKIE];

    res.clearCookie(STATE_COOKIE, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    if (!state) {
      return redirectToClient(res, "/explorer", {
        error: "connect_cancelled",
      });
    }

    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      return redirectToClient(res, "/explorer", {
        error: "invalid_state",
      });
    }

    if (!nonce || decoded.nonce !== nonce) {
      return finishOAuth(res, "/explorer", {
        error: "invalid_state",
      }, decoded.popup === true);
    }

    if (!code) {
      return finishOAuth(res, "/explorer", {
        error: "connect_cancelled",
      }, decoded.popup === true);
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

          return finishOAuth(res, "/explorer", {
            error: "linked_as_primary_elsewhere",
            email: profile.email,
          }, decoded.popup === true);
        }


        return finishOAuth(res, "/explorer", {
          error: "already_linked",
          email: profile.email,
        }, decoded.popup === true);
      }

      existing.name = profile.name;
      existing.email = profile.email;
      existing.picture = profile.picture;

      applyTokens(existing, tokens);

      await existing.save();

      return finishOAuth(res, "/explorer", {
        connected: existing.isPrimary ? "primary_reconnected" : "updated",
        email: profile.email,
      }, decoded.popup === true);
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


    return finishOAuth(res, "/explorer", {
      connected: "success",
      email: profile.email,
    }, decoded.popup === true);
  } catch (error) {
    console.error(error);

    return finishOAuth(res, "/explorer", {
      error: "connect_failed",
    }, decoded?.popup === true);
  }
}



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
