// SCREEN 1 — Student Dashboard. Real summary + loans + history + catalog.
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Bookmark, Bell, AlertCircle } from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import { getStudentDashboard } from "../../services/borrowService.js";
import { getBooks } from "../../services/bookService.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ active: [], history: [], summary: {} });
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      setLoading(true); setError(null);
      try {
        const [dash, catalog] = await Promise.all([getStudentDashboard(user.id), getBooks()]);
        if (cancelled) return;
        setData(dash);
        setBooks(catalog.slice(0, 3));
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const s = data.summary || {};

  return (
    <div>
      <p className="dash-intro">Welcome back{user?.name ? `, ${user.name}` : ""}.</p>

      <div className="grid-stats">
        <StatCard tone="active"   icon={Bookmark}    eyebrow="Active"   value={String(s.totalActive ?? 0)}   label="Books Borrowed" />
        <StatCard tone="warning"  icon={Bell}        eyebrow="Total"    value={String(s.totalBorrowed ?? 0)} label="Total Borrowed" />
        <StatCard tone="critical" icon={AlertCircle} eyebrow="Overdue"  value={String(s.totalOverdue ?? 0)}  label="Overdue Books" />
        <StatCard tone="neutral"  icon={BookOpen}    eyebrow="Limit"    value="5" label="Books Allowed" />
      </div>

      <h2 className="page-title" style={{ margin: "26px 0 14px" }}>Library Catalog</h2>
      {loading ? (
        <div className="state"><div className="state__spinner" />Loading…</div>
      ) : (
        <div className="book-grid">
          {books.map((b) => (
            <div key={b.id} className="book-card">
              <div className="book-card__cover"><BookOpen size={22} /></div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Badge tone="green">{b.genre || "Book"}</Badge>
                <Link to={`/student/catalog/${b.id}`} className="book-card__title" style={{ marginTop: 8 }}>{b.title}</Link>
                <div className="book-card__author">By {b.author}</div>
                <div style={{ marginTop: "auto" }}>
                  <Link to={`/student/catalog/${b.id}`}><Button variant="gold" size="sm">View</Button></Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 26 }}>
        <Card title="Current Borrowings">
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "title", header: "Book Title" },
              { key: "author", header: "Author" },
              { key: "borrowed", header: "Borrow Date" },
              { key: "due", header: "Due Date" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.active}
            emptyMessage="No active borrowings."
          />
        </Card>
      </div>

      <div style={{ marginTop: 22 }}>
        <Card title="Borrowing History">
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "title", header: "Book Title" },
              { key: "author", header: "Author" },
              { key: "borrowed", header: "Borrow Date" },
              { key: "returned", header: "Return Date" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.history}
            emptyMessage="No history yet."
          />
        </Card>
      </div>
    </div>
  );
}