export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const GOOGLE_LOGIN_URL = `${API_BASE_URL}/auth/google`;

export const GOOGLE_CONNECT_URL = `${API_BASE_URL}/auth/google/connect`;
