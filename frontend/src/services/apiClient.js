// Base API client. Every service imports `api` / `request` from here.
// Reads the backend URL from .env (VITE_API_BASE_URL) and attaches the JWT.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
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

  let data = null;
  try { data = await res.json(); } catch { /* no/invalid JSON body */ }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  put: (p, body) => request(p, { method: "PUT", body }),
  del: (p) => request(p, { method: "DELETE" }),
};