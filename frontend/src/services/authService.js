// Auth API calls — wired to the real backend (see API_CONTRACT.md).
import { api } from "./apiClient.js";

export async function login(email, password) {
  // POST /auth/login -> { success, token, user: { id, email, role } }
  return api.post("/auth/login", { email, password });
}

export async function forgotPassword(email) {
  // POST /auth/forgot-password -> { message }
  return api.post("/auth/forgot-password", { email });
}

export async function getProfile(userId) {
  // GET /auth/profile/:userId -> { success, profile: { full_name, ... } }
  const res = await api.get(`/auth/profile/${userId}`);
  return res.profile;
}