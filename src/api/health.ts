import { apiFetch } from "./client";

export interface HealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export function getHealth() {
  return apiFetch<HealthResponse>("/health");
}