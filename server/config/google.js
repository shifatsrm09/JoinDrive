import dotenv from "dotenv";
dotenv.config();

import { google } from "googleapis";

/**
 * Redirect URI used for the normal "Sign in with Google" flow.
 * This is the flow that creates / logs into a JoinDrive User.
 */
export const loginRedirectUri = process.env.GOOGLE_REDIRECT_URI;

/**
 * Redirect URI used for the "Add Google Drive" account-linking flow.
 * This flow NEVER creates a JoinDrive User. It only attaches another
 * GoogleAccount to the User that is already authenticated.
 */
export const connectRedirectUri =
  process.env.GOOGLE_CONNECT_REDIRECT_URI;

/**
 * Always build a NEW OAuth2 client.
 *
 * A single shared client instance cannot be used once more than one
 * Google account exists: setCredentials() mutates the instance, so two
 * concurrent requests for two different accounts would overwrite each
 * other's tokens and read the wrong Drive.
 */
export function createOAuthClient(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

/** Client for the login flow. */
export function createLoginClient() {
  return createOAuthClient(loginRedirectUri);
}

/** Client for the account-linking flow. */
export function createConnectClient() {
  return createOAuthClient(connectRedirectUri);
}
