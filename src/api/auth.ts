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

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}

/**
 * Permanently deletes the JoinDrive account and every linked Google
 * Drive record. Google Drive itself is untouched — this only removes
 * JoinDrive's own data, freeing every linked Google account so it can
 * be used to sign up fresh or be linked elsewhere afterwards.
 */
export async function deleteAccount() {
  return apiFetch<DeleteAccountResponse>("/auth/me", {
    method: "DELETE",
  });
}
