import { API_BASE_URL } from "./config";

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
    // The API reports failures as { success, message }.
    const raw = await response.text();

    let message = raw;

    try {
      message = JSON.parse(raw).message || raw;
    } catch {
      // Not JSON, keep the raw body.
    }

    throw new Error(message || "Request failed");
  }

  return response.json();
}
