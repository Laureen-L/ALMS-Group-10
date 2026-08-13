// Librarian Dashboard — the day's work at a glance.
//
// This used to carry three tabs — Book Catalog, Borrowing Activity, Overdue
// Management — each a full table that also existed as its own sidebar screen.
// The catalog appeared twice, activity twice, and overdue three times. A
// dashboard that duplicates half the app is impossible to navigate and
// impossible to demo.
//
// It now does what a dashboard should: the numbers, the trend, and short
// "needs attention" lists that hand off to the screen that owns each job.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, ClipboardCheck, AlertTriangle, CalendarClock, Coins, Boxes,
  ArrowRight, Plus, ArrowLeftRight,
} from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import LineChart from "../../components/charts/LineChart.jsx";
import { getLibrarianDashboard, getDueSoon } from "../../services/adminService.js";
import { getFines, formatMoney } from "../../services/fineService.js";
import { getTrendsReport } from "../../services/reportService.js";

// Turn "2026-07" into "Jul 26" for the trends axis.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(iso) {
  const [year, month] = String(iso).split("-");
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year.slice(2)}` : iso;
}

// How many rows a preview panel shows before it stops being a summary and
// starts being the screen it links to.
const PREVIEW_ROWS = 5;

export default function LibrarianDashboardPage() {
  const navigate = useNavigate();

  const [dash, setDash] = useState({ stats: {}, recentActivity: [], overdueList: [] });
  const [trends, setTrends] = useState([]);
  const [dueSoon, setDueSoon] = useState([]);
  const [finesOwed, setFinesOwed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        // Only the first call is load-bearing. The rest feed individual panels,
        // so a failure there shows one empty panel rather than blanking the
        // whole dashboard.
        const [d, t, ds, f] = await Promise.all([
          getLibrarianDashboard(),
          getTrendsReport().catch(() => []),
          getDueSoon().catch(() => ({ records: [] })),
          getFines({ status: "unpaid" }).catch(() => ({ totals: {} })),
        ]);
        if (cancelled) return;
        setDash(d);
        setTrends(t);
        setDueSoon(ds.records || []);
        setFinesOwed(f.totals?.unpaid || 0);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = dash.stats || {};
  const overdueCount = stats.overdueLoans ?? 0;

  return (
    <div>
      <div className="row row--between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">What needs attention today.</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Button variant="green" onClick={() => navigate("/librarian/circulation")}>
            <ArrowLeftRight size={16} /> Circulation Desk
          </Button>
          <Button variant="ghost" onClick={() => navigate("/librarian/books/new")}>
            <Plus size={16} /> Add Book
          </Button>
        </div>
      </div>

      {/* Every card is the way into the screen that owns that number. */}
      <div className="grid-stats" style={{ marginTop: 18 }}>
        <StatCard
          tone="neutral" icon={BookOpen} eyebrow="Books"
          value={String(stats.totalBooks ?? 0)} label="Total Books"
          onClick={() => navigate("/librarian/catalog")}
        />
        <StatCard
          tone="active" icon={ClipboardCheck} eyebrow="Active"
          value={String(stats.activeLoans ?? 0)} label="Active Loans"
          onClick={() => navigate("/librarian/activity")}
        />
        <StatCard
          tone={overdueCount > 0 ? "critical" : "neutral"} icon={AlertTriangle} eyebrow="Action"
          value={String(overdueCount)} label="Overdue Loans"
          onClick={() => navigate("/librarian/overdue")}
        />
        <StatCard
          tone={dueSoon.length > 0 ? "warning" : "neutral"} icon={CalendarClock} eyebrow="Coming up"
          value={String(dueSoon.length)} label="Due Soon"
          onClick={() => navigate("/librarian/due-soon")}
        />
        <StatCard
          tone={finesOwed > 0 ? "warning" : "neutral"} icon={Coins} eyebrow="Owed"
          value={formatMoney(finesOwed)} label="Outstanding Fines"
          onClick={() => navigate("/librarian/fines")}
        />
      </div>

      {overdueCount > 0 && (
        <div style={{ margin: "22px 0" }}>
          <AlertBanner
            tone="danger"
            message={`${overdueCount} overdue loan${overdueCount === 1 ? "" : "s"} need chasing.`}
            action={
              <Button variant="outline" style={{ background: "#fff" }} onClick={() => navigate("/librarian/overdue")}>
                Work the overdue list
              </Button>
            }
          />
        </div>
      )}

      <div style={{ margin: "22px 0" }}>
        <Card title="Borrowing Trends">
          <LineChart
            data={trends.map((t) => ({ ...t, label: monthLabel(t.month) }))}
            xKey="label"
            yKey="count"
            height={220}
          />
        </Card>
      </div>

      {/* Previews, not the screens themselves. Each stops at five rows and
          hands off to the page that can actually act on them. */}
      <div style={{ marginBottom: 22 }}>
        <Card
          title="Falling due next"
          action={
            <button className="link-btn row" style={{ gap: 4 }} onClick={() => navigate("/librarian/due-soon")}>
              All due soon <ArrowRight size={14} />
            </button>
          }
        >
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "member", header: "Member" },
              { key: "title", header: "Book" },
              { key: "due", header: "Due" },
            ]}
            rows={dueSoon.slice(0, PREVIEW_ROWS)}
            onRowClick={(r) => r.userId && navigate(`/librarian/members/${r.userId}`)}
            emptyMessage="Nothing due in the next few days."
          />
        </Card>
      </div>

      <Card
        title="Recent activity"
        action={
          <button className="link-btn row" style={{ gap: 4 }} onClick={() => navigate("/librarian/activity")}>
            All records <ArrowRight size={14} />
          </button>
        }
      >
        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "member", header: "Member" },
            { key: "title", header: "Book Title" },
            { key: "borrowed", header: "Borrowed" },
            { key: "due", header: "Due" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={(dash.recentActivity || []).slice(0, PREVIEW_ROWS)}
          onRowClick={(r) => r.userId && navigate(`/librarian/members/${r.userId}`)}
          emptyMessage="No recent activity."
        />
      </Card>
    </div>
  );
}
