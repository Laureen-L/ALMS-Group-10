// Librarian — Overdue Management. Real overdue records (GET /admin/overdue).
import { useState, useEffect } from "react";
import { AlertTriangle, Send } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import { getOverdue } from "../../services/adminService.js";

export default function OverdueManagementPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try { const r = await getOverdue(); if (!cancelled) setRows(r); }
      catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <h1 className="page-title">Overdue Management</h1>
      <p className="page-sub">Loans past their due date.</p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="critical" icon={AlertTriangle} eyebrow="Action" value={String(rows.length)} label="Overdue Loans" />
      </div>

      {rows.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <AlertBanner tone="danger" message={`${rows.length} loans need a reminder.`}
            action={<Button variant="outline" style={{ background: "#fff" }}><Send size={16} /> Send All Reminders</Button>} />
        </div>
      )}

      <Card title="Overdue Loans">
        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "member", header: "Member" },
            { key: "title", header: "Book Title" },
            { key: "due", header: "Due Date" },
            { key: "status", header: "Status", render: () => <StatusBadge status="overdue" /> },
            { key: "actions", header: "Action", render: () => <button className="act-edit"><Send size={14} /> Remind</button> },
          ]}
          rows={rows}
          emptyMessage="Nothing overdue — nice."
        />
      </Card>
    </div>
  );
}