// Auth API calls — wired to the real backend (see API_CONTRACT.md).
import { api } from "./apiClient.js";

export async function login(email, password) {
  // POST /auth/login -> { success, token, user: { id, email, role } }
  return api.post("/auth/login", { email, password });
}

// POST /auth/register -> { success, message, user }
// role may be "student" or "librarian"; the backend rejects "admin".
export async function register({ full_name, email, password, role = "student" }) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    if (role === "admin") throw new Error("Cannot self-register as admin");
    return { success: true, message: "Registered successfully" };
  }
  return api.post("/auth/register", { full_name, email, password, role });
}

export async function forgotPassword(email) {
  // POST /auth/forgot-password -> { message }
  return api.post("/auth/forgot-password", { email });
}

// Mirrors the mock users in AuthContext so mock mode shows the signed-in
// person rather than always the same student.
const MOCK_PROFILES = {
  1: { full_name: "Kwame Nkrumah",  email: "student@knust.edu.gh",   phone: "0244000000", role: "student" },
  2: { full_name: "Ama Serwaa",     email: "librarian@knust.edu.gh", phone: "0201234567", role: "librarian" },
  3: { full_name: "Dr. Isaac Manu", email: "admin@knust.edu.gh",     phone: "0277654321", role: "admin" },
};

export async function getProfile(userId) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    const p = MOCK_PROFILES[userId] || MOCK_PROFILES[1];
    return { id: userId, is_active: true, ...p };
  }

  // GET /auth/profile/:userId -> { success, profile: { full_name, ... } }
  const res = await api.get(`/auth/profile/${userId}`);
  return res.user || res.profile;
}

// POST /auth/reset-password — authorised by the recovery token in the
// emailed link, not by a session.
export async function resetPassword(accessToken, newPassword) {
  return api.post("/auth/reset-password", { accessToken, newPassword });
}

// PUT /auth/password — change your own password while signed in.
export async function changePassword(currentPassword, newPassword) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    if (currentPassword === newPassword) throw new Error("The new password must be different from the current one.");
    return { success: true, message: "Password changed." };
  }
  return api.put("/auth/password", { currentPassword, newPassword });
}

export async function updateProfile(userId, patch) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return { success: true, message: "Profile updated" };
  }
  // PUT /auth/profile/:userId
  return api.put(`/auth/profile/${userId}`, patch);
}