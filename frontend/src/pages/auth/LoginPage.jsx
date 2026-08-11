// Auth — Sign in. Email + password with validation, error + loading states.
// On success, sends the user to their role's dashboard.
// Dev logins (mock): any password. student@ / librarian@ / admin@knust.edu.gh
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { validateEmail, validateRequired } from "../../utils/validators.js";

const HOME = { student: "/student/dashboard", librarian: "/librarian/dashboard", admin: "/admin/dashboard" };

// Only shown in demo/mock mode — hidden automatically once real logins are on.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const DEMO_ACCOUNTS = [
  { label: "Student",   email: "student@knust.edu.gh" },
  { label: "Librarian", email: "librarian@knust.edu.gh" },
  { label: "Admin",     email: "admin@knust.edu.gh" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Set by SignUpPage after a successful registration.
  const notice = location.state?.notice;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Fill the form from a demo account so testers don't have to type anything.
  function useDemo(account) {
    setEmail(account.email);
    setPassword("demo1234");
    setErrors({});
  }

  async function onSubmit(e) {
    e.preventDefault();
    const next = {
      email: validateEmail(email),
      password: validateRequired(password, "Password"),
    };
    setErrors(next);
    if (next.email || next.password) return;

    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(HOME[user.role] || "/");
    } catch (err) {
      setErrors({ form: err.message || "Could not sign in. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="auth__title">Welcome back</h2>
      <p className="auth__subtitle">Sign in to your library account.</p>

      {notice && <p className="auth__notice" style={{ marginBottom: 12 }}>{notice}</p>}
      {errors.form && <p className="field__error" style={{ marginBottom: 12 }}>{errors.form}</p>}

      <div className="stack" style={{ gap: 16 }}>
        <Input
          id="email" label="Email address" type="email" placeholder="you@knust.edu.gh"
          value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email}
        />
        <Input
          id="password" label="Password" type="password" placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password}
        />

        <div className="row row--between" style={{ marginTop: -4 }}>
          <span />
          <Link to="/forgot-password" style={{ color: "var(--green-700)", fontSize: 14, fontWeight: 500 }}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="green" block disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>

        <p className="auth__hint" style={{ textAlign: "center" }}>
          New here? <Link to="/signup">Create account</Link>
        </p>

        {USE_MOCK && (
          <div style={{ marginTop: 8, padding: "12px 14px", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: "var(--radius)" }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--muted)" }}>
              Demo accounts — tap one, any password works:
            </p>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => useDemo(a)}
                  style={{ cursor: "pointer", fontSize: 13, padding: "6px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", background: "var(--cream, #fff)", color: "var(--ink)" }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}