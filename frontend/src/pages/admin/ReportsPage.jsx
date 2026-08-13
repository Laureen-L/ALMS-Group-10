// Shared (librarian + admin) — reports off /api/admin/reports/*.
//
// Librarians can now reach this. They get the three operational reports —
// trends, most-borrowed, overdue rate — because those are what decide what to
// reorder and which loans to chase, and they had access to none of them.
// Genre mix and top borrowers stay with admins; the backend guards match.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Send } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import DonutChart from "../../components/charts/DonutChart.jsx";
import LineChart from "../../components/charts/LineChart.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import {
  getGenreReport, getTrendsReport, getTopBooks,
  getOverdueRate, getTopBorrowers,
} from "../../services/reportService.js";
import { usePortal } from "../../hooks/usePortal.js";

// Turn "2026-07" into "Jul 2026" for the trends axis.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(iso) {
  const [year, month] = String(iso).split("-");
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year.slice(2)}` : iso;
}

// Horizontal ranked bar — used for both top books and top borrowers.
function RankedBars({ items, labelOf, valueOf, emptyMessage }) {
  if (!items || items.length === 0) return <div className="state">{emptyMessage}</div>;
  const max = Math.max(1, ...items.map(valueOf));
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="rank-row">
          <div>
            <div className="rank-row__label">{labelOf(item)}</div>
            <div className="rank-row__track">
              <div className="rank-row__fill" style={{ width: `${(valueOf(item) / max) * 100}%` }} />
            </div>
          </div>
          <div className="rank-row__value">{valueOf(item)}</div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { base, isAdmin } = usePortal();
  const [genres, setGenres] = useState([]);
  const [trends, setTrends] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [overdueRate, setOverdueRate] = useState(null);
  const [topBorrowers, setTopBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        // Split by what the report is *for*, matching the guards on
        // /admin/reports/*. Librarians get the operational three — they decide
        // what to reorder and which loans to chase, and cannot do either
        // without them. Genre mix is collection strategy, and top borrowers is
        // a list of named people ranked by their reading habits; both stay
        // with admins. Requesting them as a librarian would just 403.
        const [t, tb, rate] = await Promise.all([
          getTrendsReport(), getTopBooks(), getOverdueRate(),
        ]);
        const [g, borrowers] = isAdmin
          ? await Promise.all([getGenreReport(), getTopBorrowers()])
          : [[], []];

        if (cancelled) return;
        setGenres(g); setTrends(t); setTopBooks(tb);
        setOverdueRate(rate); setTopBorrowers(borrowers);
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (loading) return <div className="state"><div className="state__spinner" />Loading reports…</div>;
  if (error) return <div className="state">Couldn’t load reports. {error.message}</div>;

  const trendData = trends.map((t) => ({ ...t, label: monthLabel(t.month) }));
  const rateIsHealthy = (overdueRate?.rate ?? 0) < 10;

  return (
    <div>
      <h1 className="page-title">{isAdmin ? "Library Reports" : "Collection Insights"}</h1>
      <p className="page-sub">
        {isAdmin
          ? "Collection, lending and overdue analytics."
          : "What's moving, what's late, and what to reorder."}
      </p>

      <div className="detail-grid detail-grid--even" style={{ alignItems: "stretch" }}>
        {/* Genre mix is a collection-strategy question, not a desk one. */}
        {isAdmin && (
          <Card title="Collection by Genre">
            <DonutChart data={genres} labelKey="genre" valueKey="count" />
          </Card>
        )}

        <Card title="Overdue Rate">
          {overdueRate && (
            <div className="big-stat">
              <div className={`big-stat__value ${rateIsHealthy ? "big-stat__value--ok" : ""}`}>
                {overdueRate.rate}%
              </div>
              <p className="big-stat__caption">
                {overdueRate.overdue} of {overdueRate.total} open loans are overdue
              </p>
            </div>
          )}

          {/* Sending reminders used to live here as well as on two other
              screens. It belongs with the list of who is actually being
              reminded, so this links there instead of being a third trigger. */}
          <div style={{ marginTop: 18, borderTop: "1px solid var(--border-soft)", paddingTop: 16 }}>
            <p className="page-sub" style={{ marginTop: 0 }}>
              Chase these on the overdue screen, where you can see who they are first.
            </p>
            <Button variant="outline" onClick={() => navigate(`${base}/overdue`)}>
              <Send size={16} /> Work the overdue list
            </Button>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 22 }}>
        <Card title="Borrowing Trends">
          <LineChart data={trendData} xKey="label" yKey="count" />
        </Card>
      </div>

      <div className="detail-grid detail-grid--even" style={{ marginTop: 22 }}>
        <Card title="Top 10 Most Borrowed Books">
          <RankedBars
            items={topBooks}
            labelOf={(b) => `${b.title}${b.author ? ` — ${b.author}` : ""}`}
            valueOf={(b) => b.borrow_count || 0}
            emptyMessage="No loans recorded yet."
          />
        </Card>

        {/* A list of named people ranked by their reading habits. Admins only —
            a librarian has no operational need for it. */}
        {isAdmin && (
          <Card title="Top Borrowers">
            <DataTable
              columns={[
                { key: "full_name", header: "Name" },
                { key: "email", header: "Email" },
                { key: "borrow_count", header: "Borrows" },
              ]}
              rows={topBorrowers}
              rowKey="email"
              emptyMessage="No borrowing activity yet."
            />
          </Card>
        )}
      </div>

      {(overdueRate?.overdue ?? 0) > 0 && (
        <p className="page-sub" style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={15} color="var(--red-600)" />
          Overdue loans are also listed individually on the Overdue Loans screen.
        </p>
      )}
    </div>
  );
}
