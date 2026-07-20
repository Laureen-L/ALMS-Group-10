// Student — Borrowing History. Real returned/late loans, paginated client-side.
import { useState, useEffect } from "react";
import Card from "../../components/ui/Card.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import Pagination from "../../components/tables/Pagination.jsx";
import { getStudentDashboard } from "../../services/borrowService.js";
import { useAuth } from "../../context/AuthContext.jsx";

const PER_PAGE = 8;

export default function BorrowingHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getStudentDashboard(user.id);
        if (!cancelled) setHistory(data.history);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const totalPages = Math.max(1, Math.ceil(history.length / PER_PAGE));
  const rows = history.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <h1 className="page-title">Borrowing History</h1>
      <p className="page-sub">Every book you’ve borrowed and returned.</p>

      <Card title="Past Borrowings">
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
          rows={rows}
          emptyMessage="No history yet."
        />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}