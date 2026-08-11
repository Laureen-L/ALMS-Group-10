// SCREEN 8 — Reports & Analytics. Reports off /api/admin/reports/*, with KPI
// cards, a date-range filter on the trend line, and CSV / print export.
import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Send, Library, BookCopy, Percent, Download, Printer } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Select from "../../components/ui/Select.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DonutChart from "../../components/charts/DonutChart.jsx";
import LineChart from "../../components/charts/LineChart.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import {
  getGenreReport, getTrendsReport, getTopBooks,
  getOverdueRate, getTopBorrowers, sendOverdueReminders,
} from "../../services/reportService.js";

// Build a CSV string from rows of objects and trigger a browser download.
function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const RANGE_OPTIONS = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
];

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
  const [genres, setGenres] = useState([]);
  const [trends, setTrends] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [overdueRate, setOverdueRate] = useState(null);
  const [topBorrowers, setTopBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date range for the trend line (months back).
  const [range, setRange] = useState("12");

  // SMS reminders
  const [sending, setSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null); // { type, text }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [g, t, tb, rate, borrowers] = await Promise.all([
          getGenreReport(), getTrendsReport(), getTopBooks(),
          getOverdueRate(), getTopBorrowers(),
        ]);
        if (cancelled) return;
        setGenres(g); setTrends(t); setTopBooks(tb);
        setOverdueRate(rate); setTopBorrowers(borrowers);
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function onSendReminders() {
    setSending(true);
    setSmsResult(null);
    try {
      const res = await sendOverdueReminders();
      const skipped = res.skipped?.length || 0;
      const failed = res.failed?.length || 0;
      setSmsResult({
        type: failed > 0 ? "err" : "ok",
        text: `${res.remindersSent} reminder(s) sent`
          + (skipped ? `, ${skipped} skipped (no phone number)` : "")
          + (failed ? `, ${failed} failed` : "") + ".",
      });
    } catch (e) {
      setSmsResult({ type: "err", text: e.message || "Couldn’t send reminders." });
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="state"><div className="state__spinner" />Loading reports…</div>;
  if (error) return <div className="state">Couldn’t load reports. {error.message}</div>;

  const trendData = trends
    .slice(-Number(range))
    .map((t) => ({ ...t, label: monthLabel(t.month) }));
  const rateIsHealthy = (overdueRate?.rate ?? 0) < 10;

  const totalBorrows = trends.reduce((sum, t) => sum + (t.count || 0), 0);
  const collectionSize = genres.reduce((sum, g) => sum + (g.count || 0), 0);
  const topGenre = genres.reduce((best, g) => (g.count > (best?.count ?? -1) ? g : best), null);

  function exportCsv() {
    downloadCsv("alms-borrowing-trends.csv", trends.map((t) => ({ month: t.month, borrows: t.count })));
  }

  return (
    <div>
      <div className="row row--between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Library Reports</h1>
          <p className="page-sub">Collection, lending and overdue analytics.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={exportCsv}><Download size={16} /> Export CSV</Button>
          <Button variant="ghost" onClick={() => window.print()}><Printer size={16} /> Print / PDF</Button>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="neutral" icon={Library}  eyebrow="Collection" value={collectionSize.toLocaleString()} label="Books in catalog" />
        <StatCard tone="active"  icon={BookCopy} eyebrow="Lending"    value={totalBorrows.toLocaleString()}  label="Total borrows" />
        <StatCard tone={rateIsHealthy ? "active" : "critical"} icon={Percent} eyebrow="Overdue" value={`${overdueRate?.rate ?? 0}%`} label="Overdue rate" />
        <StatCard tone="neutral" icon={Library}  eyebrow="Popular"    value={topGenre?.genre || "—"} label="Top genre" />
      </div>

      <div className="detail-grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "stretch" }}>
        <Card title="Collection by Genre">
          <DonutChart data={genres} labelKey="genre" valueKey="count" />
        </Card>

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

          <div style={{ marginTop: 18, borderTop: "1px solid var(--border-soft)", paddingTop: 16 }}>
            <p className="page-sub" style={{ marginTop: 0 }}>
              Text every member holding an overdue book.
            </p>
            {smsResult && (
              <p className={`circ-message circ-message--${smsResult.type}`}>{smsResult.text}</p>
            )}
            <Button variant="gold" onClick={onSendReminders} disabled={sending}>
              <Send size={16} /> {sending ? "Sending…" : "Send Overdue Reminders"}
            </Button>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 22 }}>
        <Card title="Borrowing Trends">
          <div className="row row--between" style={{ marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <span className="page-sub" style={{ margin: 0 }}>Monthly loans over time.</span>
            <div style={{ width: 180 }}>
              <Select value={range} onChange={(e) => setRange(e.target.value)} options={RANGE_OPTIONS} />
            </div>
          </div>
          <LineChart data={trendData} xKey="label" yKey="count" />
        </Card>
      </div>

      <div className="detail-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 22 }}>
        <Card title="Top 10 Most Borrowed Books">
          <RankedBars
            items={topBooks}
            labelOf={(b) => `${b.title}${b.author ? ` — ${b.author}` : ""}`}
            valueOf={(b) => b.borrow_count || 0}
            emptyMessage="No loans recorded yet."
          />
        </Card>

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
