import { google } from "googleapis";

import oauth2Client from "../config/google.js";
import GoogleAccount from "../models/GoogleAccount.js";

export async function getAuthenticatedClient(accountId) {
  const account = await GoogleAccount.findById(accountId);

  if (!account) {
    throw new Error("Google account not found");
  }

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiryDate,
  });

  if (
    !account.expiryDate ||
    Date.now() >= account.expiryDate - 60000
  ) {
    const { credentials } = await oauth2Client.refreshAccessToken();

    account.accessToken = credentials.access_token;

    if (credentials.expiry_date) {
      account.expiryDate = credentials.expiry_date;
    }

    await account.save();

    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}