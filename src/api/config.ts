const apiUrls = (import.meta.env.VITE_API_URL || "/api")
  .split(",")
  .map((url: string) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

if (!apiUrls.length) {
  throw new Error("VITE_API_URL must be set in the frontend .env file");
}

export const API_BASE_URL =
  apiUrls.find(
    (url: string) => new URL(url, window.location.origin).hostname === window.location.hostname
  ) || apiUrls[0];

export const GOOGLE_LOGIN_URL = `${API_BASE_URL}/auth/google`;

export const GOOGLE_CONNECT_URL = `${API_BASE_URL}/auth/google/connect`;
