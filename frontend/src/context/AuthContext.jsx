// Auth state for the whole app: current user, role, login/logout.
//
// Ships with a MOCK login so the team can build every screen before the
// backend exists. When the backend is ready, replace the body of `login`
// with a real call to authService.login() — nothing else changes.

import { createContext, useContext, useEffect, useState } from "react";
import { TOKEN_KEY } from "../services/apiClient.js";
import { ROLES } from "../constants/roles.js";

const AuthContext = createContext(null);
const USER_KEY = "alms_user";

// --- Mock users for development. Delete once real auth is wired. ---
const MOCK_USERS = {
  "student@knust.edu.gh":   { id: 1, name: "Kwame Nkrumah",  role: ROLES.STUDENT,   email: "student@knust.edu.gh" },
  "librarian@knust.edu.gh": { id: 2, name: "Ama Serwaa",     role: ROLES.LIBRARIAN, email: "librarian@knust.edu.gh" },
  "admin@knust.edu.gh":     { id: 3, name: "Dr. Isaac Manu", role: ROLES.ADMIN,     email: "admin@knust.edu.gh" },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on first load.
  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  async function login(email, password) {
    // TODO(backend): replace with authService.login(email, password)

    // Normalize so casing / whitespace can't cause a wrong match.
    const key = (email || "").trim().toLowerCase();
    const found = MOCK_USERS[key];

    // No silent fallback: an unknown email is a real error you can see.
    if (!found) {
      throw new Error(
        "No account for that email. Use student@, librarian@ or admin@knust.edu.gh"
      );
    }

    const token = "mock-jwt-token";
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(found));
    setUser(found);
    return found;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  const value = { user, loading, isAuthenticated: !!user, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}