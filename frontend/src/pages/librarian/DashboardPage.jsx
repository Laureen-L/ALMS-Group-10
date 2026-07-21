// SCREEN 5 — Librarian Dashboard. Real stats + tabs (catalog / activity / overdue).
import { useState, useEffect } from "react";
import { BookOpen, ClipboardCheck, AlertTriangle, Plus, Pencil, Trash2, Send } from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Card from "../../components/ui/Card.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import { useNavigate } from "react-router-dom";
import { getLibrarianDashboard } from "../../services/adminService.js";
import { getBooks, deleteBook } from "../../services/bookService.js";

export default function LibrarianDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("catalog");
  const [dash, setDash] = useState({ stats: {}, recentActivity: [], overdueList: [] });
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [d, b] = await Promise.all([getLibrarianDashboard(), getBooks({ search: query })]);
      setDash(d); setBooks(b);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function confirmRemove() {
    try { await deleteBook(removing.id); setRemoving(null); load(); }
    catch (e) { setError(e); setRemoving(null); }
  }

  const stats = dash.stats || {};

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Manage the catalog, loans, and overdue books.</p>

      <div className="grid-stats">
        <StatCard tone="neutral"  icon={BookOpen}      eyebrow="Catalog"  value={String(stats.totalBooks ?? 0)}   label="Total Books" />
        <StatCard tone="active"   icon={ClipboardCheck} eyebrow="Active"  value={String(stats.activeLoans ?? 0)}  label="Active Loans" />
        <StatCard tone="critical" icon={AlertTriangle} eyebrow="Action"   value={String(stats.overdueLoans ?? 0)} label="Overdue Loans" />
        <StatCard tone="neutral"  icon={BookOpen}      eyebrow="Live"     value={String(books.length)} label="Books Listed" />
      </div>

      {(stats.overdueLoans ?? 0) > 0 && (
        <div style={{ margin: "22px 0" }}>
          <AlertBanner tone="danger" message={`You have ${stats.overdueLoans} overdue loans that require action.`}
            action={<Button variant="outline" style={{ background: "#fff" }} onClick={() => setTab("overdue")}>View Overdue</Button>} />
        </div>
      )}

      <Card>
        <Tabs active={tab} onChange={setTab} tabs={[
          { id: "catalog", label: "Book Catalog" },
          { id: "activity", label: "Borrowing Activity" },
          { id: "overdue", label: "Overdue Management" },
        ]} />

        <div style={{ marginTop: 18 }}>
          {tab === "catalog" && (
            <>
              <div className="toolbar">
                <div className="toolbar__search">
                  <Input placeholder="Search by title…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <Button variant="ghost" onClick={load}>Search</Button>
                <Button variant="green" onClick={() => navigate("/librarian/books/new")}><Plus size={16} /> Add New Book</Button>
              </div>
              <DataTable
                loading={loading} error={error}
                columns={[
                  { key: "title", header: "Title" },
                  { key: "author", header: "Author" },
                  { key: "genre", header: "Genre" },
                  { key: "publishedYear", header: "Year" },
                  { key: "actions", header: "Actions", render: (r) => (
                    <span className="actions-cell">
                      <button className="act-edit"><Pencil size={14} /> Edit</button>
                      <button className="act-remove" onClick={() => setRemoving(r)}><Trash2 size={14} /> Remove</button>
                    </span>
                  ) },
                ]}
                rows={books}
                emptyMessage="No books in the catalog yet."
              />
            </>
          )}

          {tab === "activity" && (
            <DataTable
              loading={loading} error={error}
              columns={[
                { key: "member", header: "Member" },
                { key: "title", header: "Book Title" },
                { key: "borrowed", header: "Borrow Date" },
                { key: "due", header: "Due Date" },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={dash.recentActivity}
              emptyMessage="No recent activity."
            />
          )}

          {tab === "overdue" && (
            <DataTable
              loading={loading} error={error}
              columns={[
                { key: "member", header: "Member" },
                { key: "title", header: "Book Title" },
                { key: "due", header: "Due Date" },
                { key: "status", header: "Status", render: () => <StatusBadge status="overdue" /> },
                { key: "actions", header: "Action", render: () => <button className="act-edit"><Send size={14} /> Remind</button> },
              ]}
              rows={dash.overdueList}
              emptyMessage="Nothing overdue."
            />
          )}
        </div>
      </Card>

      {removing && (
        <Modal title="Remove this book?" onClose={() => setRemoving(null)}
          footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" onClick={confirmRemove}>Remove book</Button></>}>
          <p>Remove <strong>{removing.title}</strong> from the catalog? This can’t be undone.</p>
        </Modal>
      )}
    </div>
  );
}