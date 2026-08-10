// Student — My Borrowings. Active loans and history in one tabbed view.
// Replaces the separate Borrowing History screen.
import { useState, useEffect } from "react";
import { Bookmark, Bell, AlertCircle } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import BorrowLimit, { BORROW_LIMIT } from "../../components/books/BorrowLimit.jsx";
import { getStudentDashboard, returnBook } from "../../services/borrowService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const TABS = [
  { id: "active", label: "Active Loans" },
  { id: "history", label: "History" },
];

// Whole days between now and the due date. Negative once it's overdue.
function daysLeft(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
}

function DaysLeftCell({ row }) {
  const days = daysLeft(row.dueRaw || row.due);
  if (days === null) return <span>—</span>;
  if (days < 0) return <span style={{ color: "var(--red-600)", fontWeight: 600 }}>{Math.abs(days)} days overdue</span>;
  return (
    <span style={{ color: days < 3 ? "var(--red-600)" : "var(--green-700)", fontWeight: 600 }}>
      {days} {days === 1 ? "day" : "days"} left
    </span>
  );
}

export default function MyBorrowingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("active");
  const [data, setData] = useState({ active: [], overdue: [], history: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [returningId, setReturningId] = useState(null);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getStudentDashboard(user.id));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.id]);

  async function onReturn(row) {
    setReturningId(row.id);
    try {
      await returnBook(row.id);
      toast.success(`Returned “${row.title}”.`);
      await load(); // refresh after returning
    } catch (e) {
      toast.error(e.message || "Couldn’t return that book.");
    } finally {
      setReturningId(null);
    }
  }

  // Overdue loans are still on loan, so they belong under Active.
  const activeRows = [...(data.active || []), ...(data.overdue || [])];
  const historyRows = data.history || [];
  const activeCount = activeRows.length;

  return (
    <div>
      <h1 className="page-title">My Borrowings</h1>
      <p className="page-sub">Everything you have on loan, and everything you've returned.</p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="active"   icon={Bookmark}    eyebrow="Active"  value={String(data.summary?.totalActive ?? 0)}   label="Books Borrowed" />
        <StatCard tone="critical" icon={AlertCircle} eyebrow="Overdue" value={String(data.summary?.totalOverdue ?? 0)}  label="Overdue" />
        <StatCard tone="neutral"  icon={Bell}        eyebrow="Total"   value={String(data.summary?.totalBorrowed ?? 0)} label="Total Borrowed" />
        <BorrowLimit activeLoans={activeCount} />
      </div>

      <Card>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <div style={{ marginTop: 18 }}>
          {activeTab === "active" ? (
            <DataTable
              loading={loading}
              error={error}
              columns={[
                { key: "title", header: "Book Title" },
                { key: "author", header: "Author" },
                { key: "borrowed", header: "Borrow Date" },
                { key: "due", header: "Due Date" },
                { key: "daysLeft", header: "Time Left", render: (r) => <DaysLeftCell row={r} /> },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
                { key: "action", header: "Action", render: (r) => (
                  <button className="link-btn" disabled={returningId === r.id} onClick={() => onReturn(r)}>
                    {returningId === r.id ? "Returning…" : "Return"}
                  </button>
                ) },
              ]}
              rows={activeRows}
              emptyMessage="No active loans."
            />
          ) : (
            <DataTable
              loading={loading}
              error={error}
              columns={[
                { key: "title", header: "Book Title" },
                { key: "author", header: "Author" },
                { key: "borrowed", header: "Borrow Date" },
                { key: "returned", header: "Return Date" },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={historyRows}
              emptyMessage="No borrowing history yet."
            />
          )}
        </div>
      </Card>

      {activeCount >= BORROW_LIMIT && (
        <p className="borrow-limit__warn" style={{ marginTop: 14 }}>
          ⚠ Limit reached — return a book before borrowing another.
        </p>
      )}
    </div>
  );
}
