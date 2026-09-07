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

  const isExpired =
    !account.expiryDate || Date.now() >= account.expiryDate - 60000;

  if (isExpired) {
    if (!account.refreshToken) {
      throw new Error(
        "This Google account needs to be reconnected"
      );
    }


    const { credentials } = await client.refreshAccessToken();
    const updates = { lastSynced: new Date() };

    if (credentials.access_token) {
      updates.accessToken = credentials.access_token;
    }

    if (credentials.refresh_token) {
      updates.refreshToken = credentials.refresh_token;
    }

    if (credentials.expiry_date) {
      updates.expiryDate = credentials.expiry_date;
    }

    await GoogleAccount.updateOne({ _id: account._id }, { $set: updates });
    Object.assign(account, updates);
  }

  return client;
}
