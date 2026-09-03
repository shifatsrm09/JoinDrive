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

    // refreshAccessToken() already calls setCredentials() on this
    // client internally and emits "tokens", which the listener above
    // persists to the database. Saving `account` again here as well
    // raced against that listener's save() on the very same document,
    // which is what caused Mongoose's "Can't save() the same doc
    // multiple times in parallel" error you'd see whenever several
    // expired accounts refreshed at once (e.g. loading the dashboard).
    await client.refreshAccessToken();
  }

  return client;
}
