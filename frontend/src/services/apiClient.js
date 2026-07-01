// Base API client. Every service file imports `request` from here.
// Reads the backend URL from .env (VITE_API_BASE_URL) and attaches the JWT.
//
// NOTE: backend is owned by another team. Swap nothing here when they ship —
// just point VITE_API_BASE_URL at their server. The token key below must match
// what AuthContext stores.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
export const TOKEN_KEY = "alms_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function request(path, { method = "GET", body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch { /* non-JSON error body */ }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  put: (p, body) => request(p, { method: "PUT", body }),
  del: (p) => request(p, { method: "DELETE" }),
};
