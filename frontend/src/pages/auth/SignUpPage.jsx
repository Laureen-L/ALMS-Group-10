// Auth — Create account. Registers against POST /auth/register, then sends
// the new member to the login screen.
// Admin is deliberately not offered: the backend rejects self-registered admins.
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import { register } from "../../services/authService.js";
import { validateEmail, validateRequired, validatePassword } from "../../utils/validators.js";

export default function SignUpPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const next = {
      fullName: validateRequired(fullName, "Full name"),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    if (next.fullName || next.email || next.password) return;

    setBusy(true);
    try {
      await register({ full_name: fullName, email, password, role });
      navigate("/login", {
        state: { notice: "Account created. Sign in to continue." },
      });
    } catch (err) {
      setErrors({ form: err.message || "Could not create your account. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="auth__title">Create your account</h2>
      <p className="auth__subtitle">Join the KNUST library.</p>

      {errors.form && <p className="field__error" style={{ marginBottom: 12 }}>{errors.form}</p>}

      <div className="stack" style={{ gap: 16 }}>
        <Input
          id="full_name" label="Full name" placeholder="Kwame Nkrumah"
          value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName}
        />
        <Input
          id="email" label="Email address" type="email" placeholder="you@knust.edu.gh"
          value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email}
        />
        <Input
          id="password" label="Password" type="password" placeholder="At least 8 characters"
          value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password}
        />
        <Select
          id="role" label="I am a" value={role} onChange={(e) => setRole(e.target.value)}
          options={[
            { value: "student", label: "Student" },
            { value: "librarian", label: "Librarian" },
          ]}
        />

        <Button type="submit" variant="green" block disabled={busy}>
          {busy ? "Creating account…" : "Create Account"}
        </Button>

        <p className="auth__hint" style={{ textAlign: "center" }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </form>
  );
}
