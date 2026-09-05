import { createLoginClient } from "../config/google.js";
import GoogleAccount from "../models/GoogleAccount.js";


export async function getAuthenticatedClient(accountOrId) {
  const account = accountOrId?.accessToken
    ? accountOrId
    : await GoogleAccount.findById(accountOrId);

  if (!account) {
    throw new Error("Google account not found");
  }

  const client = createLoginClient();

  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiryDate,
  });

  client.on("tokens", async (tokens) => {
    try {
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

      await account.save();
    } catch (error) {
      console.error("Failed to persist refreshed tokens", error);
    }
  });

  const isExpired =
    !account.expiryDate || Date.now() >= account.expiryDate - 60000;

  if (isExpired) {
    if (!account.refreshToken) {
      throw new Error(
        "This Google account needs to be reconnected"
      );
    }


    await client.refreshAccessToken();
  }

  return client;
}
