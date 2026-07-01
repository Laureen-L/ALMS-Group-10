// Auth API calls. Currently MOCKED so the team can build/test without a backend.
// When the backend is ready, replace each mock body with the real `api` call in the
// comment above it. Nothing in the screens needs to change.
import { api } from "./apiClient.js"; // eslint-disable-line no-unused-vars

const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms));

export async function login(email, password) {
  // REAL: return api.post("/auth/login", { email, password });
  await wait();
  if (!email || !password) throw new Error("Email and password are required.");
  return { token: "mock-jwt-token", user: { email } };
}

export async function forgotPassword(email) {
  // REAL: return api.post("/auth/forgot-password", { email });
  await wait();
  return { ok: true };
}

export async function resetPassword(token, newPassword) {
  // REAL: return api.post("/auth/reset-password", { token, password: newPassword });
  await wait();
  if (!token) throw new Error("This reset link is invalid or has expired.");
  return { ok: true };
}