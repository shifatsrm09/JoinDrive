import dotenv from "dotenv";
dotenv.config();

import { google } from "googleapis";

export const loginRedirectUri = process.env.GOOGLE_REDIRECT_URI;

export const connectRedirectUri =
  process.env.GOOGLE_CONNECT_REDIRECT_URI;

export function createOAuthClient(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}


export function createLoginClient() {
  return createOAuthClient(loginRedirectUri);
}


export function createConnectClient() {
  return createOAuthClient(connectRedirectUri);
}
