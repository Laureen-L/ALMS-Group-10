// Admin — library policy.
//
// The loan period (14 days) and the borrow limit (5 books) were `const`
// declarations in the backend's borrowController, so changing library policy
// meant editing source and redeploying. They live in the database now, and
// this is where an administrator sets them.
//
// Everything here takes effect on the next transaction: the borrow, renewal
// and fine handlers read these values per request rather than at startup.
import { useState, useEffect } from "react";
import { SlidersHorizontal, RotateCcw, Save } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { getPolicy, updatePolicy, POLICY_FIELDS, POLICY_DEFAULTS } from "../../services/settingsService.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function SystemSettingsPage() {
  const toast = useToast();

  const [saved, setSaved] = useState(null);   // what the server currently holds
  const [draft, setDraft] = useState(null);   // what's in the form
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [persisted, setPersisted] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const policy = await getPolicy();
        if (cancelled) return;
        setSaved(policy);
        setDraft(policy);
        setPersisted(policy.persisted !== false);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Only the fields that actually moved get sent, so the audit entry records a
  // real change rather than a row-wide rewrite on every save.
  const changed = draft && saved
    ? POLICY_FIELDS.filter((f) => Number(draft[f.key]) !== Number(saved[f.key])).map((f) => f.key)
    : [];

  async function save() {
    setBusy(true);
    try {
      const patch = {};
      changed.forEach((key) => { patch[key] = Number(draft[key]); });
      const next = await updatePolicy(patch);
      setSaved(next);
      setDraft(next);
      toast.success(`Policy updated — ${changed.length} setting(s) changed.`);
    } catch (e) {
      toast.error(e.message || "Could not save library policy.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="state"><div className="state__spinner" />Loading policy…</div>;
  if (error) return <div className="state">Couldn’t load library policy. {error.message}</div>;

  return (
    <div>
      <h1 className="page-title">Library Policy</h1>
      <p className="page-sub">
        The rules the system enforces on every loan, renewal and return. Changes apply immediately —
        existing loans keep the due dates they were given.
      </p>

      {!persisted && (
        <p className="circ-message circ-message--err">
          ❌ The system_settings table isn’t in the database yet, so these are the built-in defaults
          and saving will fail. Run the governance migration
          (<code>prisma/migrations/20260813140000_governance</code>) first.
        </p>
      )}

      <Card
        title="Circulation rules"
        action={
          <div className="row" style={{ gap: 8 }}>
            {changed.length > 0 && <Badge tone="amber">{changed.length} unsaved</Badge>}
            <Button variant="ghost" onClick={() => setDraft(saved)} disabled={busy || changed.length === 0}>
              <RotateCcw size={16} /> Revert
            </Button>
            <Button variant="gold" onClick={save} loading={busy} disabled={changed.length === 0 || !persisted}>
              <Save size={16} /> Save changes
            </Button>
          </div>
        }
      >
        <div className="policy-grid">
          {POLICY_FIELDS.map((field) => {
            const isChanged = changed.includes(field.key);
            return (
              <div key={field.key} className={["policy-row", isChanged && "policy-row--changed"].filter(Boolean).join(" ")}>
                <div className="policy-row__text">
                  <label className="policy-row__label" htmlFor={`policy-${field.key}`}>
                    {field.label}
                    <span className="policy-row__unit"> ({field.unit})</span>
                  </label>
                  <p className="policy-row__help">{field.help}</p>
                  {isChanged && (
                    <p className="policy-row__was">
                      was {saved[field.key]} · default {POLICY_DEFAULTS[field.key]}
                    </p>
                  )}
                </div>
                <div className="policy-row__input">
                  <Input
                    id={`policy-${field.key}`}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step || 1}
                    value={draft[field.key]}
                    onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ marginTop: 22 }}>
        <Card title="What these do">
          <ul className="policy-notes">
            <li>
              <strong>Borrow limit</strong> and <strong>loan period</strong> are checked when a book is
              checked out. Lowering the limit never retracts books a member already holds — it only
              stops the next one.
            </li>
            <li>
              <strong>Renewals</strong> extend from the existing due date, not from today, so renewing
              early never shortens a loan. An overdue loan cannot be renewed at all.
            </li>
            <li>
              <strong>Fine per day</strong> is charged when a book is returned late, after the grace
              period. Setting it to 0 switches fines off entirely; loans already fined keep their
              charges.
            </li>
            <li>
              <strong>Due-soon window</strong> and <strong>low-stock threshold</strong> only change what
              the desk screens show. They enforce nothing.
            </li>
          </ul>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            <SlidersHorizontal size={14} style={{ verticalAlign: "-2px" }} /> Every change is recorded
            in the audit log with the old and new value.
          </p>
        </Card>
      </div>
    </div>
  );
}
