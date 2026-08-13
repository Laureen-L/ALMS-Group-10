// SCREEN 4 — Admin Dashboard. Real stats + monthly chart + members + records.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, ClipboardCheck, AlertTriangle, ArrowRight } from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import BarChart from "../../components/charts/BarChart.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import { getAdminStats, getMembers, getBorrowRecords } from "../../services/adminService.js";

const roleTone = { student: "green", librarian: "gold", admin: "amber" };

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [s, m, r] = await Promise.all([getAdminStats(), getMembers(), getBorrowRecords()]);
        if (cancelled) return;
        setStats(s); setMembers(m.slice(0, 5)); setRecords(r.slice(0, 5));
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <h1 className="page-title">System Overview</h1>
      <p className="page-sub">Real-time statistics for the KNUST library.</p>

      {/* Every card leads somewhere. "Total Books" was a dead number until
          admins got a catalog route of their own. */}
      <div className="grid-stats">
        <StatCard tone="neutral"  icon={BookOpen}      eyebrow="Books" value={String(stats.totalBooks ?? 0)}   label="Total Books"   onClick={() => navigate("/admin/catalog")} />
        <StatCard tone="active"   icon={Users}         eyebrow="People"  value={String(stats.totalMembers ?? 0)} label="Total Members" onClick={() => navigate("/admin/users")} />
        <StatCard tone="active"   icon={ClipboardCheck} eyebrow="Active" value={String(stats.activeLoans ?? 0)}  label="Active Loans"  onClick={() => navigate("/admin/borrow-records")} />
        <StatCard tone="critical" icon={AlertTriangle} eyebrow="Action"  value={String(stats.overdueLoans ?? 0)} label="Overdue Loans" onClick={() => navigate("/admin/overdue")} />
      </div>

      <div style={{ marginTop: 22 }}>
        <Card title="Monthly Lending Trends">
          <BarChart data={stats.borrowsPerMonth || []} />
        </Card>
      </div>

      <div style={{ marginTop: 22 }}>
        <Card
          title="Newest members"
          action={
            <button className="link-btn row" style={{ gap: 4 }} onClick={() => navigate("/admin/users")}>
              Manage users <ArrowRight size={14} />
            </button>
          }
        >
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "role", header: "Role", render: (r) => <Badge tone={roleTone[r.role] || "neutral"}>{r.role}</Badge> },
              { key: "joined", header: "Join Date" },
            ]}
            rows={members}
            onRowClick={(r) => navigate(`/admin/members/${r.id}`)}
            emptyMessage="No members yet."
          />
        </Card>
      </div>

      <div style={{ marginTop: 22 }}>
        <Card
          title="Recent Borrow Records"
          action={
            <button className="link-btn row" style={{ gap: 4 }} onClick={() => navigate("/admin/borrow-records")}>
              All records <ArrowRight size={14} />
            </button>
          }
        >
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "member", header: "Member" },
              { key: "title", header: "Book Title" },
              { key: "borrowed", header: "Borrow Date" },
              { key: "due", header: "Due Date" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={records}
            onRowClick={(r) => r.userId && navigate(`/admin/members/${r.userId}`)}
            emptyMessage="No borrow records yet."
          />
        </Card>
      </div>
    </div>
  );
}