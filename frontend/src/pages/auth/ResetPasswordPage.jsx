// Auth — Reset Password. The page the emailed link opens (URL carries ?token=...).
// New password + confirm, validated, then a success state that links back to login.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { validatePassword, validateMatch } from "../../utils/validators.js";
import { resetPassword } from "../../services/authService.js";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token"); // e.g. /reset-password?token=abc123

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const next = {
      password: validatePassword(password),
      confirm: validateMatch(password, confirm),
    };
    setErrors(next);
    if (next.password || next.confirm) return;

    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (e2) {
      setErrors({ form: e2.message || "Could not reset password." });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div>
        <h2 className="auth__title">Password updated</h2>
        <p className="auth__subtitle">Your password has been changed. You can now sign in with it.</p>
        <div className="auth__notice" style={{ marginTop: 12 }}>
          <CheckCircle2 size={20} />
          <span>All set — your account is secured with the new password.</span>
        </div>
        <Link to="/login" className="auth__back"><ArrowLeft size={16} /> Back to Sign In</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="auth__title">Set a new password</h2>
      <p className="auth__subtitle">Choose a strong password you haven’t used before.</p>

      {errors.form && <p className="field__error" style={{ marginBottom: 12 }}>{errors.form}</p>}

      <div className="stack" style={{ gap: 16, marginTop: 8 }}>
        <div>
          <Input
            id="password" label="New password" type="password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password}
          />
          <p className="auth__hint">At least 8 characters.</p>
        </div>
        <Input
          id="confirm" label="Confirm password" type="password" placeholder="••••••••"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm}
        />
        <Button type="submit" variant="green" block disabled={busy}>
          {busy ? "Updating…" : "Reset Password"}
        </Button>
      </div>

      <Link to="/login" className="auth__back"><ArrowLeft size={16} /> Back to Sign In</Link>
    </form>
  );
}