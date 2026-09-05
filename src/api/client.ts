import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const raw = await response.text();

    let message: string;

    try {
      message = JSON.parse(raw).message || raw;
    } catch {
      message = raw || "Request failed";
    }

    throw new ApiError(message || "Request failed", response.status);
  }

  return response.json();
}
