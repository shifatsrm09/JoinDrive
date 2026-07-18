const API = "http://localhost:5000/api";

export async function getMe() {
  const res = await fetch(`${API}/auth/me`, {
    credentials: "include",
  });

  return res.json();
}