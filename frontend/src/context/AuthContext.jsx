// Auth state: current user, role, login/logout.
// Toggle between MOCK login and the REAL backend with one line in .env:
//   VITE_USE_MOCK=true   -> mock logins (student@/librarian@/admin@), no backend needed
//   VITE_USE_MOCK=false  -> real POST /auth/login against http://localhost:5000/api
import { createContext, useContext, useEffect, useState } from "react";
import { TOKEN_KEY, onSessionExpired } from "../services/apiClient.js";
import { ROLES } from "../constants/roles.js";
import { useToast } from "./ToastContext.jsx";
import * as authService from "../services/authService.js";

const AuthContext = createContext(null);
const USER_KEY = "alms_user";
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

// --- Mock users for development (only used when VITE_USE_MOCK=true) ---
const MOCK_USERS = {
  "student@knust.edu.gh":   { id: 1, name: "Kwame Nkrumah",  role: ROLES.STUDENT,   email: "student@knust.edu.gh" },
  "librarian@knust.edu.gh": { id: 2, name: "Ama Serwaa",     role: ROLES.LIBRARIAN, email: "librarian@knust.edu.gh" },
  "admin@knust.edu.gh":     { id: 3, name: "Dr. Isaac Manu", role: ROLES.ADMIN,     email: "admin@knust.edu.gh" },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    // A corrupt entry would otherwise throw and leave the app stuck loading.
    if (stored) {
      try { setUser(JSON.parse(stored)); }
      catch { localStorage.removeItem(USER_KEY); }
    }
    setLoading(false);
  }, []);

  // The API client ends the session on any 401; clear our copy of the user so
  // ProtectedRoute bounces to /login instead of rendering a broken page.
  useEffect(() => onSessionExpired(() => {
    setUser(null);
    toast.info("Your session expired. Please sign in again.");
  }), [toast]);

  async function login(email, password) {
    if (USE_MOCK) {
      const key = (email || "").trim().toLowerCase();
      const found = MOCK_USERS[key];
      if (!found) throw new Error("No account for that email. Use student@, librarian@ or admin@knust.edu.gh");
      localStorage.setItem(TOKEN_KEY, "mock-jwt-token");
      localStorage.setItem(USER_KEY, JSON.stringify(found));
      setUser(found);
      return found;
    }

   // --- REAL backend ---
    const res = await authService.login(email, password);   // { token, user }
    localStorage.setItem(TOKEN_KEY, res.token);
    const found = {
      id: res.user.id,
      email: res.user.email,
      role: res.user.role,
      name: res.user.full_name || res.user.email,   // name is already in the login response
    };
    localStorage.setItem(USER_KEY, JSON.stringify(found));
    setUser(found);
    return found;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  // Merge fresh profile fields into the signed-in user so the topbar/sidebar
  // update immediately after a profile save — no logout required.
  function updateLocalUser(data) {
    setUser((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  const value = { user, loading, isAuthenticated: !!user, login, logout, updateLocalUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}