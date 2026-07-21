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
import { getProfile, updateProfile } from "../../services/authService.js";

export default function ProfilePage() {
  const { user, updateLocalUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ full_name: "" });
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      setLoading(true); setError(null);
      try {
        const p = await getProfile(user.id);
        if (!cancelled) {
          setProfile(p);
          setFormData({ full_name: p.full_name || user?.name || "" });
        }
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, user?.name]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile(user.id, { full_name: formData.full_name });
      setProfile((prev) => ({ ...prev, full_name: formData.full_name }));
      updateLocalUser({ name: formData.full_name });
      setIsEditing(false);
    } catch (e) {
      setSaveError(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="state"><div className="state__spinner" />Loading profile…</div>;
  if (error) return <div className="state">Couldn’t load your profile. {error.message}</div>;

  const p = profile || {};
  const email = p.email || user?.email || "—";
  const role = p.role || user?.role || "student";

  return (
    <div>
      <div className="profile-head" />
      <div className="profile-card">
        <div className="profile-id-row">
          <div className="profile-avatar"><Avatar name={p.full_name || user?.name || ""} size={96} /></div>
          <div style={{ flex: 1 }}>
            <div className="profile-name">{p.full_name || user?.name || ""} <Badge tone="green">{role}</Badge></div>
            <div className="profile-email">{email}</div>
            <div className="page-sub" style={{ margin: "4px 0 0" }}>{p.is_active ? "Active member" : "Inactive"}</div>
          </div>
          {!isEditing ? (
            <Button variant="gold" onClick={() => setIsEditing(true)}><Pencil size={16} /> Update Profile</Button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="ghost" onClick={() => { setIsEditing(false); setFormData({ full_name: p.full_name || user?.name || "" }); }}>Cancel</Button>
              <Button variant="gold" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid" style={{ gridTemplateColumns: "1fr 340px" }}>
        <Card title="Personal Information">
          {saveError && <p className="field__error" style={{ marginBottom: 12 }}>{saveError.message}</p>}
          <div className="form-grid">
            <Input 
              label="Full Name" 
              value={formData.full_name} 
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={!isEditing || saving} 
            />
            <Input label="Email Address" value={email} disabled />
            <Input label="Role" value={role} disabled />
            <Input label="Status" value={p.is_active ? "Active" : "Inactive"} disabled />
          </div>
          <p className="auth__hint" style={{ marginTop: 12 }}>
            You can now update your profile name!
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