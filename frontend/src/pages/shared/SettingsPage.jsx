// Shared — your own account preferences.
//
// This screen used to be a lie: five toggles and a dropdown held in React
// state, with a "Save Changes" button wired to nothing. Every switch reset the
// moment you navigated away, and nothing was ever sent anywhere.
//
// They now persist to users.preferences (JSONB) through PUT /auth/profile/:id.
// The server merges the patch over what is stored, so this screen sending
// three keys never clears a fourth it doesn't know about.
//
// Library-wide policy is not here — that is an administrator's screen at
// /admin/settings. This one only ever changes things about you.
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Toggle from "../../components/ui/Toggle.jsx";
import Button from "../../components/ui/Button.jsx";
import Select from "../../components/ui/Select.jsx";
import {
  getPreferences, savePreferences, PREFERENCE_DEFAULTS,
} from "../../services/settingsService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { usePortal } from "../../hooks/usePortal.js";

const SECTIONS = [
  "General Library",
  "Science and Technology",
  "Engineering",
  "Business",
  "Arts and Social Sciences",
];

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { canEditPolicy } = usePortal();

  const [saved, setSaved] = useState(PREFERENCE_DEFAULTS);
  const [draft, setDraft] = useState(PREFERENCE_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setLoadError(null);
      try {
        const prefs = await getPreferences(user.id);
        if (cancelled) return;
        setSaved(prefs);
        setDraft(prefs);
      } catch (e) {
        if (!cancelled) setLoadError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Drives whether Save does anything, and whether Cancel has something to
  // undo. Without it the button is always live and always lies about having
  // saved something.
  const dirty = Object.keys(PREFERENCE_DEFAULTS).some((key) => draft[key] !== saved[key]);

  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    setBusy(true);
    try {
      const next = await savePreferences(user.id, draft);
      setSaved(next);
      setDraft(next);
      toast.success("Preferences saved.");
    } catch (e) {
      toast.error(e.message || "Could not save your preferences.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="state"><div className="state__spinner" />Loading preferences…</div>;

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Your notification preferences. These apply to your account only.</p>

      {loadError && (
        <p className="circ-message circ-message--err">
          ❌ Couldn’t load your saved preferences ({loadError.message}). You’re seeing the defaults —
          saving now will overwrite what’s stored.
        </p>
      )}

      <div className="stack" style={{ maxWidth: 760 }}>
        <Card title="Notifications">
          <div className="stack" style={{ gap: 16 }}>
            <Toggle
              checked={draft.emailNotifications}
              onChange={set("emailNotifications")}
              label="Email notifications"
            />
            <Toggle
              checked={draft.dueReminders}
              onChange={set("dueReminders")}
              label="Due-date reminders"
            />
            <Toggle
              checked={draft.weeklySummary}
              onChange={set("weeklySummary")}
              label="Weekly borrowing summary"
            />
            <Toggle
              checked={draft.activityAlerts}
              onChange={set("activityAlerts")}
              label="Login and account activity alerts"
            />
          </div>
          <p className="page-sub" style={{ marginBottom: 0, marginTop: 14 }}>
            Overdue notices always reach you in the app regardless of these settings — they are the
            library telling you it wants a book back, not marketing.
          </p>
        </Card>

        <Card title="Library preferences">
          <Select
            id="library-section"
            label="Preferred library section"
            value={draft.preferredSection}
            onChange={(e) => set("preferredSection")(e.target.value)}
            options={SECTIONS}
          />
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Used to personalise recommendations on your dashboard.
          </p>
        </Card>

        {/* Two-factor authentication used to sit here as a toggle. It was
            wired to nothing, and there is no second-factor flow behind it —
            a switch that claims to secure an account and doesn't is worse
            than no switch, so it is gone until the flow exists. */}

        {canEditPolicy && (
          <Card title="Administrator">
            <p className="page-sub" style={{ marginTop: 0 }}>
              Loan periods, borrow limits, fine rates and renewals are library-wide policy, not
              personal preferences.
            </p>
            <Link to="/admin/settings" className="btn btn--outline" style={{ display: "inline-flex", gap: 8 }}>
              <SlidersHorizontal size={16} /> Library Policy
            </Link>
          </Card>
        )}

        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <Button variant="outline" onClick={() => setDraft(saved)} disabled={busy || !dirty}>
            Cancel
          </Button>
          <Button variant="gold" onClick={save} loading={busy} disabled={!dirty}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
