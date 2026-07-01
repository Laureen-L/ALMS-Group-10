// SCREEN 3 — Forgot Password. Enter email -> "Send Reset Link".
// After sending, swaps to a confirmation message. "Back to Sign In" returns to login.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { validateEmail } from "../../utils/validators.js";
import { forgotPassword } from "../../services/authService.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;

    setBusy(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (e2) {
      setError(e2.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div>
        <h2 className="auth__title">Check your email</h2>
        <p className="auth__subtitle">
          If an account exists for <strong>{email}</strong>, we’ve sent a link to reset your password.
        </p>
        <div className="auth__notice" style={{ marginTop: 12 }}>
          <MailCheck size={20} />
          <span>The link expires in 30 minutes. Don’t forget to check your spam folder.</span>
        </div>
        <Link to="/login" className="auth__back"><ArrowLeft size={16} /> Back to Sign In</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="auth__title">Forgot password?</h2>
      <p className="auth__subtitle">Enter your email address and we’ll send you a reset link.</p>

      <div className="stack" style={{ gap: 16, marginTop: 8 }}>
        <Input
          id="email" label="Email address" type="email" placeholder="you@knust.edu.gh"
          value={email} onChange={(e) => setEmail(e.target.value)} error={error}
        />
        <Button type="submit" variant="green" block disabled={busy}>
          {busy ? "Sending…" : "Send Reset Link"}
        </Button>
      </div>

      <Link to="/login" className="auth__back"><ArrowLeft size={16} /> Back to Sign In</Link>
    </form>
  );
}