// Auth — Sign in. Email + password with validation, error + loading states.
// On success, sends the user to their role's dashboard.
// Dev logins (mock): any password. student@ / librarian@ / admin@knust.edu.gh
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { validateEmail, validateRequired } from "../../utils/validators.js";

const HOME = { student: "/student/dashboard", librarian: "/librarian/dashboard", admin: "/admin/dashboard" };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

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
      </div>
    </form>
  );
}