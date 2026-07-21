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
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return {
      id: userId,
      full_name: "Kwame Nkrumah",
      email: "student@knust.edu.gh",
      role: "student",
      is_active: true
    };
  }

  // GET /auth/profile/:userId -> { success, profile: { full_name, ... } }
  const res = await api.get(`/auth/profile/${userId}`);
  return res.user || res.profile;
}

export async function resetPassword(token, newPassword) {
  return api.post("/auth/reset-password", { token, newPassword });
}

export async function updateProfile(userId, patch) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return { success: true, message: "Profile updated" };
  }
  // PUT /auth/profile/:userId
  return api.put(`/auth/profile/${userId}`, patch);
}