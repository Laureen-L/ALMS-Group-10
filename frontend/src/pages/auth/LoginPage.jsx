// Auth — Sign in. Email + password with validation, error + loading states.
// On success, sends the user to their role's dashboard.
// Dev logins (mock): any password. student@ / librarian@ / admin@knust.edu.gh
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { resendConfirmation } from "../../services/authService.js";
import { validateEmail, validateRequired } from "../../utils/validators.js";

const HOME = { student: "/student/dashboard", librarian: "/librarian/dashboard", admin: "/admin/dashboard" };

// Supabase rejects an unconfirmed sign-in with "Email not confirmed", which
// looks like a wrong password to anyone who didn't see the email. Recognising
// it is what lets us offer the link again instead of just saying no.
const UNCONFIRMED = /email not confirmed/i;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Set by SignUpPage after a successful registration.
  const notice = location.state?.notice;

  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // The address whose confirmation link we can offer to re-send. Set either by
  // arriving straight from sign-up, or by a login that failed for that reason.
  const [unconfirmed, setUnconfirmed] = useState(
    location.state?.needsConfirmation ? location.state.email : ""
  );
  const [resendNotice, setResendNotice] = useState("");
  const [resending, setResending] = useState(false);

  async function onResend() {
    setResending(true);
    setResendNotice("");
    try {
      const res = await resendConfirmation(unconfirmed);
      setResendNotice(res?.message || "Confirmation email sent.");
    } catch (err) {
      setResendNotice(err.message || "Could not send the email. Try again shortly.");
    } finally {
      setResending(false);
    }
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
      if (UNCONFIRMED.test(err.message || "")) {
        setUnconfirmed(email);
        setResendNotice("");
        setErrors({ form: "Confirm your email address before signing in — check your inbox for the link." });
      } else {
        setErrors({ form: err.message || "Could not sign in. Try again." });
      }
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

      {unconfirmed && (
        <p className="auth__hint" style={{ marginBottom: 12 }}>
          {resendNotice || (
            <>
              Didn’t get the email?{" "}
              <button
                type="button"
                onClick={onResend}
                disabled={resending}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  color: "var(--green-700)", fontSize: "inherit", fontWeight: 500,
                  textDecoration: "underline",
                }}
              >
                {resending ? "Sending…" : "Send it again"}
              </button>
            </>
          )}
        </p>
      )}

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
      </div>
    </form>
  );
}