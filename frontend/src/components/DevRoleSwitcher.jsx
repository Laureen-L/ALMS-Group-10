// DEV ONLY — one-click role switcher so you can jump between portals without
// logging out or fighting browser autofill. It renders only during `npm run dev`
// (import.meta.env.DEV) and never in a production build.
// Delete this file and its <DevRoleSwitcher /> line in App.jsx before submitting.
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const OPTIONS = [
  { label: "Student",   email: "student@knust.edu.gh",   to: "/student/dashboard" },
  { label: "Librarian", email: "librarian@knust.edu.gh", to: "/librarian/dashboard" },
  { label: "Admin",     email: "admin@knust.edu.gh",     to: "/admin/dashboard" },
];

export default function DevRoleSwitcher() {
  const { login, user, logout } = useAuth();
  const navigate = useNavigate();

  if (!import.meta.env.DEV) return null; // never shows in production

  async function go(opt) {
    await login(opt.email, "dev");
    navigate(opt.to);
  }

  const wrap = {
    position: "fixed", bottom: 16, left: 16, zIndex: 9999,
    display: "flex", alignItems: "center", gap: 6,
    background: "#1f2933", color: "#fff", padding: "8px 10px",
    borderRadius: 999, fontSize: 12, boxShadow: "0 6px 20px rgba(0,0,0,.25)",
    fontFamily: "system-ui, sans-serif",
  };
  const tag = { opacity: .7, marginRight: 4 };
  const btn = (active) => ({
    border: "none", cursor: "pointer", borderRadius: 999,
    padding: "5px 10px", fontSize: 12, fontWeight: 600,
    background: active ? "#3f8f67" : "rgba(255,255,255,.15)", color: "#fff",
  });

  return (
    <div style={wrap}>
      <span style={tag}>DEV · {user ? user.role : "signed out"}</span>
      {OPTIONS.map((o) => (
        <button key={o.label} style={btn(user?.email === o.email)} onClick={() => go(o)}>
          {o.label}
        </button>
      ))}
      <button style={btn(false)} onClick={() => { logout(); navigate("/login"); }}>Logout</button>
    </div>
  );
}