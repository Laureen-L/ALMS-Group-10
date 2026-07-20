// SCREEN 6 — Student Profile. Loads the REAL profile (GET /auth/profile/:id).
// NOTE: the contract has no update-profile or change-password endpoint yet,
// so those buttons are disabled and flagged. Wire them when the backend adds them.
import { useState, useEffect } from "react";
import { KeyRound, Pencil } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import Input from "../../components/ui/Input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getProfile } from "../../services/authService.js";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      setLoading(true); setError(null);
      try {
        const p = await getProfile(user.id);
        if (!cancelled) setProfile(p);
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) return <div className="state"><div className="state__spinner" />Loading profile…</div>;
  if (error) return <div className="state">Couldn’t load your profile. {error.message}</div>;

  const p = profile || {};
  const name = p.full_name || user?.name || "—";
  const email = p.email || user?.email || "—";
  const role = p.role || user?.role || "student";

  return (
    <div>
      <div className="profile-head" />
      <div className="profile-card">
        <div className="profile-id-row">
          <div className="profile-avatar"><Avatar name={name} size={96} /></div>
          <div style={{ flex: 1 }}>
            <div className="profile-name">{name} <Badge tone="green">{role}</Badge></div>
            <div className="profile-email">{email}</div>
            <div className="page-sub" style={{ margin: "4px 0 0" }}>{p.is_active ? "Active member" : "Inactive"}</div>
          </div>
          <Button variant="gold" disabled title="Not available yet"><Pencil size={16} /> Update Profile</Button>
        </div>
      </div>

      <div className="detail-grid" style={{ gridTemplateColumns: "1fr 340px" }}>
        <Card title="Personal Information">
          <div className="form-grid">
            <Input label="Full Name" value={name} disabled />
            <Input label="Email Address" value={email} disabled />
            <Input label="Role" value={role} disabled />
            <Input label="Status" value={p.is_active ? "Active" : "Inactive"} disabled />
          </div>
          <p className="auth__hint" style={{ marginTop: 12 }}>
            Editing isn’t available yet — the backend has no update-profile endpoint.
          </p>
        </Card>

        <div className="stack" style={{ gap: 22 }}>
          <Card title="Security">
            <p className="page-sub" style={{ marginBottom: 14 }}>Password changes aren’t available yet.</p>
            <Button variant="gold" block disabled title="Not available yet"><KeyRound size={16} /> Change Password</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}