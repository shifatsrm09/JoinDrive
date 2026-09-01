import { apiFetch } from "./client";

export interface MeResponse {
  success: boolean;
  user: {
    id: string;
    accounts: {
      _id: string;
      googleId: string;
      email: string;
      name: string;
      picture: string;
      isPrimary?: boolean;
    }[];
  };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export async function getMe() {
  return apiFetch<MeResponse>("/auth/me");
}

export async function logout() {
  return apiFetch<LogoutResponse>("/auth/logout", {
    method: "POST",
  });
}
