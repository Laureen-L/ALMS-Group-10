// Shared (librarian + admin) — the staff view of one title.
//
// Members had a book detail page; staff had nothing equivalent. The only way
// to edit a title was a modal launched from a table row, and there was no way
// at all to answer the question a desk actually gets asked: "it says none are
// available — who has them, and when are they back?"
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Users, AlertTriangle, Pencil, Archive, RotateCcw } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import EditBookModal from "../../components/books/EditBookModal.jsx";
import { getBookDetail, withdrawBook, restoreBook } from "../../services/bookService.js";
import { formatDate } from "../../utils/formatDate.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePortal } from "../../hooks/usePortal.js";

const isLate = (loan) => {
  if (loan.status === "overdue") return true;
  if (!loan.due_date) return false;
  return String(loan.due_date).slice(0, 10) < new Date().toISOString().slice(0, 10);
};

export default function BookDetailPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { base } = usePortal();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getBookDetail(bookId)); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [bookId]);

  useEffect(() => { load(); }, [load]);

  async function toggleCirculation() {
    setBusy(true);
    try {
      const inCirculation = data.summary.inCirculation;
      await (inCirculation ? withdrawBook(bookId) : restoreBook(bookId));
      toast.success(inCirculation ? "Withdrawn from circulation." : "Back in circulation.");
      await load();
    } catch (e) {
      toast.error(e.message || "That didn’t work.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="state"><div className="state__spinner" />Loading title…</div>;
  if (error) return <div className="state">{error.message || "Couldn’t load this title."}</div>;
  if (!data?.book) return <div className="state">Book not found.</div>;

  const { book, currentHolders, history, summary } = data;

  return (
    <div>
      <button
        className="link-btn"
        onClick={() => navigate(`${base}/catalog`)}
        style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={16} /> Back to books
      </button>

      <div className="row row--between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{book.title}</h1>
          <p className="page-sub" style={{ margin: 0 }}>
            By {book.author}{book.isbn ? ` · ISBN ${book.isbn}` : ""}
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {book.genre && <Badge tone="green">{book.genre}</Badge>}
          {!summary.inCirculation && <Badge tone="neutral">Withdrawn</Badge>}
          <Button variant="ghost" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</Button>
          <Button variant="outline" loading={busy} onClick={toggleCirculation}>
            {summary.inCirculation
              ? <><Archive size={16} /> Withdraw</>
              : <><RotateCcw size={16} /> Restore</>}
          </Button>
        </div>
      </div>

      <div className="grid-stats" style={{ margin: "22px 0" }}>
        <StatCard
          tone={book.availableQuantity > 0 ? "active" : "warning"}
          icon={BookOpen}
          eyebrow="Stock"
          value={`${book.availableQuantity}/${book.qty ?? book.availableQuantity}`}
          label="Available now"
        />
        <StatCard tone="neutral" icon={Users} eyebrow="Out" value={String(summary.onLoan)} label="Copies On Loan" />
        <StatCard
          tone={summary.overdue > 0 ? "critical" : "neutral"}
          icon={AlertTriangle}
          eyebrow="Late"
          value={String(summary.overdue)}
          label="Overdue Copies"
        />
        <StatCard tone="neutral" icon={BookOpen} eyebrow="Lifetime" value={String(summary.timesBorrowed)} label="Times Borrowed" />
      </div>

      {!summary.inCirculation && (
        <p className="circ-message circ-message--err">
          ❌ This title is out of circulation. It won’t appear in the member catalog and can’t be borrowed.
        </p>
      )}

      <Card title="Who has a copy right now">
        <DataTable
          columns={[
            { key: "member", header: "Member", render: (l) => l.users?.full_name || "—" },
            { key: "email", header: "Email", render: (l) => l.users?.email || "—" },
            { key: "borrowed", header: "Borrowed", render: (l) => formatDate(l.borrow_date) },
            { key: "due", header: "Due", render: (l) => formatDate(l.due_date) },
            { key: "status", header: "Status", render: (l) => <StatusBadge status={isLate(l) ? "overdue" : "active"} /> },
          ]}
          rows={currentHolders}
          onRowClick={(l) => l.users?.id && navigate(`${base}/members/${l.users.id}`)}
          emptyMessage="Every copy is on the shelf."
        />
      </Card>

      <div style={{ marginTop: 22 }}>
        <Card title="Borrowing history">
          <DataTable
            columns={[
              { key: "member", header: "Member", render: (l) => l.users?.full_name || "—" },
              { key: "borrowed", header: "Borrowed", render: (l) => formatDate(l.borrow_date) },
              { key: "returned", header: "Returned", render: (l) => formatDate(l.return_date) },
            ]}
            rows={history}
            onRowClick={(l) => l.users?.id && navigate(`${base}/members/${l.users.id}`)}
            emptyMessage="This title has never been borrowed."
          />
        </Card>
      </div>

      {editing && (
        <EditBookModal
          book={book}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); toast.success("Saved."); load(); }}
        />
      )}
    </div>
  );
}
