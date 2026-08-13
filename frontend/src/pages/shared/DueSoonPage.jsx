// Shared (librarian + admin) — loans about to fall due.
//
// The overdue screen is reactive: by the time a loan appears there, the book
// is already late and a fine is already accruing. This is the preventive
// counterpart — the desk can call these members while there is still time.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Phone, CalendarClock } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getDueSoon } from "../../services/adminService.js";
import { usePortal } from "../../hooks/usePortal.js";

// Whole days until the due date. 0 means today.
function daysUntil(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function urgency(days) {
  if (days === null) return { label: "—", tone: "neutral" };
  if (days <= 0) return { label: "Due today", tone: "red" };
  if (days === 1) return { label: "Tomorrow", tone: "amber" };
  return { label: `In ${days} days`, tone: "green" };
}

export default function DueSoonPage() {
  const navigate = useNavigate();
  const { base } = usePortal();

  const [records, setRecords] = useState([]);
  const [days, setDays] = useState("");
  const [windowDays, setWindowDays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // An empty value means "use the window set in library policy", which is
      // the default the backend applies.
      const res = await getDueSoon(days ? Number(days) : undefined);
      setRecords(res.records);
      setWindowDays(res.days);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const dueToday = records.filter((r) => (daysUntil(r.dueRaw || r.due) ?? 99) <= 0).length;
  const reachable = records.filter((r) => r.phone).length;

  return (
    <div>
      <h1 className="page-title">Due Soon</h1>
      <p className="page-sub">
        Loans falling due in the next {windowDays ?? "few"} day{windowDays === 1 ? "" : "s"} — chase these before they turn into overdue notices.
      </p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="warning" icon={CalendarClock} eyebrow="Window" value={String(records.length)} label="Loans Due Soon" />
        <StatCard tone={dueToday > 0 ? "critical" : "neutral"} icon={Clock} eyebrow="Today" value={String(dueToday)} label="Due Today" />
        <StatCard tone="neutral" icon={Phone} eyebrow="Contact" value={`${reachable}/${records.length}`} label="Have a Phone Number" />
      </div>

      <Card>
        <div className="toolbar">
          <div className="toolbar__filter">
            <Select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              options={[
                { value: "", label: "Policy default" },
                { value: "1", label: "Next 1 day" },
                { value: "3", label: "Next 3 days" },
                { value: "7", label: "Next 7 days" },
                { value: "14", label: "Next 14 days" },
              ]}
            />
          </div>
        </div>

        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "member", header: "Member" },
            { key: "memberEmail", header: "Email", render: (r) => r.memberEmail || "—" },
            { key: "phone", header: "Phone", render: (r) => r.phone || <span className="page-sub">none on file</span> },
            { key: "title", header: "Book" },
            { key: "due", header: "Due Date" },
            { key: "when", header: "When", render: (r) => {
              const meta = urgency(daysUntil(r.dueRaw || r.due));
              return <Badge tone={meta.tone}>{meta.label}</Badge>;
            } },
          ]}
          rows={records}
          onRowClick={(r) => r.userId && navigate(`${base}/members/${r.userId}`)}
          emptyMessage="Nothing due in this window."
        />
      </Card>
    </div>
  );
}
