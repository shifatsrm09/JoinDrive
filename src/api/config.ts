/**
 * Single source of truth for the backend URL.
 *
 * Every module must import from here. Reading import.meta.env directly
 * in more than one place is what previously produced URLs like
 * "http://localhost:5173/undefined/auth/google/connect".
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/** Full page redirect to start Google sign in. */
export const GOOGLE_LOGIN_URL = `${API_BASE_URL}/auth/google`;

/** Full page redirect to link an additional Google Drive. */
export const GOOGLE_CONNECT_URL = `${API_BASE_URL}/auth/google/connect`;
