// Shared (admin + librarian) — Overdue loan detail.
// Reached by clicking the "Overdue Loans" stat card on either dashboard.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getOverdue } from "../../services/adminService.js";

// Whole days since the due date passed.
function daysOverdue(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  return Math.max(0, Math.floor((new Date() - due) / (1000 * 60 * 60 * 24)));
}

export default function OverdueLoansPage() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try { const r = await getOverdue(); if (!cancelled) setLoans(r); }
      catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <button className="link-btn" onClick={() => navigate(-1)} style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="page-title">Overdue Loans</h1>
      <p className="page-sub">Every loan past its due date, and how far past.</p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="critical" icon={AlertTriangle} eyebrow="Action" value={String(loans.length)} label="Overdue Loans" />
      </div>

      <Card title="Details">
        <DataTable
          loading={loading}
          error={error}
          columns={[
            { key: "member", header: "Member" },
            { key: "title", header: "Book" },
            { key: "due", header: "Due Date" },
            { key: "daysOverdue", header: "Days Overdue", render: (r) => {
              const days = daysOverdue(r.dueRaw || r.due);
              return days === null
                ? <span>—</span>
                : <span style={{ color: "var(--red-600)", fontWeight: 600 }}>{days} {days === 1 ? "day" : "days"}</span>;
            } },
          ]}
          rows={loans}
          emptyMessage="Nothing overdue — nice."
        />
      </Card>
    </div>
  );
}
