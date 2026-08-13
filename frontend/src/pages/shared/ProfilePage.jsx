// SCREEN 6 — Profile. Shared by student, librarian and admin at /profile.
// Loads GET /auth/profile/:id and saves via PUT /auth/profile/:id, refreshing
// the signed-in user so the topbar name updates without a re-login.
import { useState, useEffect } from "react";
import { KeyRound, Pencil } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import Input from "../../components/ui/Input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getProfile, updateProfile, changePassword } from "../../services/authService.js";
import Modal from "../../components/ui/Modal.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { validatePassword, validateMatch } from "../../utils/validators.js";

const EMPTY_FORM = { full_name: "", phone: "" };

export default function ProfilePage() {
  const { user, updateLocalUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      setLoading(true); setError(null);
      try {
        const p = await getProfile(user.id);
        if (!cancelled) {
          setProfile(p);
          setFormData({ full_name: p.full_name || user?.name || "", phone: p.phone || "" });
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
    setSaved(false);
    try {
      await updateProfile(user.id, { full_name: formData.full_name, phone: formData.phone });
      setProfile((prev) => ({ ...prev, full_name: formData.full_name, phone: formData.phone }));
      // Refresh AuthContext so the sidebar/topbar pick up the new name now.
      updateLocalUser({ name: formData.full_name });
      setIsEditing(false);
      setSaved(true);
      toast.success("Profile updated.");
    } catch (e) {
      setSaveError(e);
      toast.error(e.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const p = profile || {};

  function cancelEdit() {
    setIsEditing(false);
    setSaveError(null);
    setFormData({ full_name: p.full_name || user?.name || "", phone: p.phone || "" });
  }

  if (loading) return <div className="state"><div className="state__spinner" />Loading profile…</div>;
  if (error) return <div className="state">Couldn’t load your profile. {error.message}</div>;

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
            <div className="page-sub" style={{ margin: "4px 0 0" }}>{p.is_active === false ? "Inactive" : "Active member"}</div>
          </div>
          {!isEditing ? (
            <Button variant="gold" onClick={() => { setIsEditing(true); setSaved(false); }}><Pencil size={16} /> Update Profile</Button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
              <Button variant="gold" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid" style={{ gridTemplateColumns: "1fr 340px" }}>
        <Card title="Personal Information">
          {saveError && <p className="field__error" style={{ marginBottom: 12 }}>{saveError.message}</p>}
          {saved && !isEditing && (
            <p className="circ-message circ-message--ok" style={{ marginBottom: 12 }}>Profile updated.</p>
          )}
          <div className="form-grid">
            <Input
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={!isEditing || saving}
            />
            <Input
              label="Phone Number"
              placeholder="0244 000 000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!isEditing || saving}
            />
            <Input label="Email Address" value={email} disabled />
            <Input label="Role" value={role} disabled />
          </div>
        </Card>

        <div className="stack" style={{ gap: 22 }}>
          <Card title="Security">
            <p className="page-sub" style={{ marginBottom: 14 }}>
              Choose a password of at least 8 characters.
            </p>
            <Button variant="gold" block onClick={() => setShowPassword(true)}>
              <KeyRound size={16} /> Change Password
            </Button>
          </Card>
        </div>
      </div>

      {showPassword && (
        <ChangePasswordModal onClose={() => setShowPassword(false)} onDone={() => toast.success("Password changed.")} />
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose, onDone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const v = {
      current: current ? "" : "Enter your current password.",
      next: validatePassword(next),
      confirm: validateMatch(next, confirm),
    };
    setErrors(v);
    if (v.current || v.next || v.confirm) return;

    setBusy(true);
    try {
      await changePassword(current, next);
      onDone();
      onClose();
    } catch (e) {
      setErrors({ form: e.message || "Could not change your password." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Change password"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="gold" onClick={submit} loading={busy}>
            {busy ? "Changing…" : "Change Password"}
          </Button>
        </>
      }
    >
      {errors.form && <p className="field__error" style={{ marginBottom: 12 }}>{errors.form}</p>}
      <div className="stack" style={{ gap: 14 }}>
        <Input label="Current password" type="password" value={current}
          onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
        <Input label="New password" type="password" value={next}
          onChange={(e) => setNext(e.target.value)} error={errors.next} />
        <Input label="Confirm new password" type="password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
      </div>
    </Modal>
  );
}
