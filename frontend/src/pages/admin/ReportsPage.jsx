// SCREEN 8 — Reports & Analytics. Real stats (GET /admin/stats).
import { useState, useEffect } from "react";
import { CalendarClock, BarChart3, BookOpen, Users } from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import Card from "../../components/ui/Card.jsx";
import BarChart from "../../components/charts/BarChart.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getAdminStats } from "../../services/adminService.js";

export default function ReportsPage() {
  const [stats, setStats] = useState({ borrowsPerMonth: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const s = await getAdminStats();
        if (!cancelled) setStats(s);
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalThisYear = (stats.borrowsPerMonth || []).reduce((sum, m) => sum + (Number(m.count) || 0), 0);

  return (
    <div>
      <h1 className="page-title">Reports & Analytics</h1>
      <p className="page-sub">Borrowing trends across the library.</p>

      <div className="grid-stats">
        <StatCard tone="neutral"  icon={BarChart3}    eyebrow="This Year" value={String(totalThisYear)}          label="Total Borrows" />
        <StatCard tone="active"   icon={BookOpen}     eyebrow="Catalog"   value={String(stats.totalBooks ?? 0)}  label="Total Books" />
        <StatCard tone="active"   icon={Users}        eyebrow="People"    value={String(stats.totalMembers ?? 0)} label="Total Members" />
        <StatCard tone="critical" icon={CalendarClock} eyebrow="Action"   value={String(stats.overdueLoans ?? 0)} label="Overdue Loans" />
      </div>

      <div style={{ marginTop: 22 }}>
        <Card title="Monthly Borrowing Trends">
          {loading ? <div className="state"><div className="state__spinner" />Loading…</div>
            : error ? <div className="state">Couldn’t load stats. {error.message}</div>
            : <BarChart data={stats.borrowsPerMonth || []} height={220} />}
        </Card>
      </div>

      <div style={{ marginTop: 22 }}>
        <Card title="Borrows Per Month">
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "month", header: "Month" },
              { key: "count", header: "Borrows" },
            ]}
            rows={stats.borrowsPerMonth || []}
            rowKey="month"
            emptyMessage="No data yet."
          />
        </Card>
      </div>
    </div>
  );
}