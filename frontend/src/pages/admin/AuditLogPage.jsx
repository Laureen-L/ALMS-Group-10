// Admin — the audit trail.
//
// This is the screen that makes an administrator something other than a
// librarian with extra buttons. Role promotions, deactivations and catalog
// removals previously left no record of who performed them: the system stored
// borrow_records.processed_by and nothing else about who did what.
//
// Read-only on purpose, top to bottom. There is no edit control here and no
// endpoint behind one — a log an administrator can rewrite is not a log.
import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Clock, User } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getAuditLog, AUDIT_ACTIONS } from "../../services/auditService.js";

// Grouped in the filter the way the log reads: by what part of the system was
// touched, rather than one flat list of sixteen verbs.
const ACTION_OPTIONS = [
  { value: "", label: "All activity" },
  ...Object.entries(AUDIT_ACTIONS).map(([value, meta]) => ({
    value,
    label: `${meta.group} — ${meta.label}`,
  })),
];

const ENTITY_OPTIONS = [
  { value: "", label: "Everything" },
  { value: "user", label: "Members" },
  { value: "book", label: "Catalog" },
  { value: "loan", label: "Loans" },
  { value: "fine", label: "Fines" },
  { value: "settings", label: "Policy" },
];

// The date alone can't order several entries on the same day, which is normal
// for a busy desk.
function timeOf(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getAuditLog({ action, entityType, limit: 200 });
      setEntries(res.entries);
      setAvailable(res.available);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [action, entityType]);

  useEffect(() => { load(); }, [load]);

  // Free-text search runs in the browser: the server already narrowed the set
  // by action and entity, and matching an actor's email or a book title across
  // 200 rows is not worth a round trip.
  const rows = entries.filter((e) =>
    !query
    || e.actor.toLowerCase().includes(query.toLowerCase())
    || e.target.toLowerCase().includes(query.toLowerCase())
    || e.actionLabel.toLowerCase().includes(query.toLowerCase()));

  const today = new Date().toDateString();
  const todayCount = entries.filter((e) => e.whenRaw && new Date(e.whenRaw).toDateString() === today).length;
  const actors = new Set(entries.map((e) => e.actor)).size;

  return (
    <div>
      <h1 className="page-title">Audit Log</h1>
      <p className="page-sub">Who changed what, and when. Nothing here can be edited or removed.</p>

      {!available && (
        <p className="circ-message circ-message--err">
          ❌ The audit_log table isn’t in the database yet. Run the governance migration
          (<code>prisma/migrations/20260813140000_governance</code>) to start recording.
        </p>
      )}

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="neutral" icon={ShieldCheck} eyebrow="Recorded" value={String(entries.length)} label="Entries Shown" />
        <StatCard tone="active" icon={Clock} eyebrow="Today" value={String(todayCount)} label="Actions Today" />
        <StatCard tone="neutral" icon={User} eyebrow="People" value={String(actors)} label="Distinct Actors" />
      </div>

      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input
              placeholder="Search actor, target, or action…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar__filter">
            <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} options={ENTITY_OPTIONS} />
          </div>
          <div className="toolbar__filter">
            <Select value={action} onChange={(e) => setAction(e.target.value)} options={ACTION_OPTIONS} />
          </div>
        </div>

        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "when", header: "When", render: (e) => (
              <span>
                {e.when}
                <span className="page-sub" style={{ display: "block", fontSize: "0.85em" }}>{timeOf(e.whenRaw)}</span>
              </span>
            ) },
            { key: "actor", header: "Who", render: (e) => (
              <span>
                {e.actor}
                {e.actorRole && (
                  <span className="page-sub" style={{ display: "block", fontSize: "0.85em" }}>{e.actorRole}</span>
                )}
              </span>
            ) },
            { key: "action", header: "Action", render: (e) => <Badge tone={e.tone}>{e.actionLabel}</Badge> },
            { key: "target", header: "Target" },
            { key: "summary", header: "Details", render: (e) => e.summary || "—" },
          ]}
          rows={rows}
          emptyMessage={available ? "Nothing recorded yet." : "Recording isn’t switched on."}
        />
      </Card>
    </div>
  );
}
