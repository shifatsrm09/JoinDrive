import { createLoginClient } from "../config/google.js";
import GoogleAccount from "../models/GoogleAccount.js";

/**
 * Build an OAuth2 client bound to ONE specific GoogleAccount.
 *
 * A brand new client is created on every call. Sharing a single client
 * across accounts would leak credentials between them, because
 * setCredentials() mutates the client instance.
 *
 * Refreshed access tokens are written back to the database so the
 * refresh only has to happen once per expiry window.
 */
export async function getAuthenticatedClient(accountId) {
  const account = await GoogleAccount.findById(accountId);

  if (!account) {
    throw new Error("Google account not found");
  }

  const client = createLoginClient();

  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiryDate,
  });

  // Persist tokens that the library refreshes on its own.
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

    const { credentials } = await client.refreshAccessToken();

    account.accessToken = credentials.access_token;

    if (credentials.refresh_token) {
      account.refreshToken = credentials.refresh_token;
    }

    if (credentials.expiry_date) {
      account.expiryDate = credentials.expiry_date;
    }

    account.lastSynced = new Date();

    await account.save();

    client.setCredentials(credentials);
  }

  return client;
}
