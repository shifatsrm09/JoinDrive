const API = "http://localhost:5000/api";

export async function getMe() {
  const res = await fetch(`${API}/auth/me`, {
    credentials: "include",
  });

  return res.json();
}

export async function logout() {
  const res = await fetch(`${API}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  return res.json();
}