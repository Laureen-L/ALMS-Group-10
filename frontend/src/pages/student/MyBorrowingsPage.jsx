// Student — My Borrowings. Real active/overdue loans with a Return action.
import { useState, useEffect } from "react";
import { Bookmark, Bell, AlertCircle } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import { getStudentDashboard, returnBook } from "../../services/borrowService.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function MyBorrowingsPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ active: [], overdue: [], summary: {} });
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
      await load(); // refresh after returning
    } catch (e) {
      setError(e);
    } finally {
      setReturningId(null);
    }
  }

  const rows = [...(data.active || []), ...(data.overdue || [])];

  return (
    <div>
      <h1 className="page-title">My Borrowings</h1>
      <p className="page-sub">Books you currently have on loan.</p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="active"   icon={Bookmark}    eyebrow="Active"   value={String(data.summary?.totalActive ?? 0)}   label="Books Borrowed" />
        <StatCard tone="critical" icon={AlertCircle} eyebrow="Overdue"  value={String(data.summary?.totalOverdue ?? 0)}  label="Overdue" />
        <StatCard tone="neutral"  icon={Bell}        eyebrow="Total"    value={String(data.summary?.totalBorrowed ?? 0)} label="Total Borrowed" />
        <StatCard tone="neutral"  icon={Bookmark}    eyebrow="Limit"    value="5" label="Books Allowed" />
      </div>

      <Card title="Active Loans">
        <DataTable
          loading={loading}
          error={error}
          columns={[
            { key: "title", header: "Book Title" },
            { key: "author", header: "Author" },
            { key: "borrowed", header: "Borrow Date" },
            { key: "due", header: "Due Date" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "action", header: "Action", render: (r) => (
              <button className="link-btn" disabled={returningId === r.id} onClick={() => onReturn(r)}>
                {returningId === r.id ? "Returning…" : "Return"}
              </button>
            ) },
          ]}
          rows={rows}
          emptyMessage="You have no active borrowings."
        />
      </Card>
    </div>
  );
}