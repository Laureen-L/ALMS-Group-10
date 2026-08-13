// Shared (librarian + admin) — everything about one member.
//
// The gap this fills: the member list showed name, email, role and join date,
// which answers none of the questions actually asked at a circulation desk.
// Can this person take another book out? What are they holding? What's late?
// Do they owe anything? That is this screen.
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookMarked, AlertTriangle, Coins, RotateCw, Phone, Mail, CalendarDays,
} from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import { getMemberDetail } from "../../services/adminService.js";
import { renewLoan, returnBook } from "../../services/borrowService.js";
import { payFine, waiveFine, formatMoney } from "../../services/fineService.js";
import { formatDate } from "../../utils/formatDate.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePortal } from "../../hooks/usePortal.js";

const roleTone = { student: "green", librarian: "gold", admin: "amber" };
const fineTone = { unpaid: "red", paid: "green", waived: "neutral" };

// 'overdue' is only stamped by the nightly job, so a loan can be days past due
// and still read 'active'. Every screen that shows a due date has to check the
// date as well, or it tells staff a member is clear when they are not.
function isLate(loan) {
  if (loan.status === "overdue") return true;
  if (!loan.due_date) return false;
  return String(loan.due_date).slice(0, 10) < new Date().toISOString().slice(0, 10);
}

export default function MemberDetailPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { base, canWaiveFines } = usePortal();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("loans");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getMemberDetail(memberId)); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  // The three row actions differ only in which call they make and what they
  // say afterwards, so they share the busy-state and reload handling.
  async function run(id, action, onSuccess) {
    setBusyId(id);
    try {
      const res = await action();
      toast.success(onSuccess(res));
      await load();
    } catch (e) {
      toast.error(e.message || "That didn’t work.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="state"><div className="state__spinner" />Loading member…</div>;
  if (error) return <div className="state">{error.message || "Couldn’t load this member."}</div>;
  if (!data?.member) return <div className="state">Member not found.</div>;

  const { member, openLoans, history, fines, summary } = data;
  const unpaidFines = (fines || []).filter((f) => f.status === "unpaid");

  return (
    <div>
      <button
        className="link-btn"
        onClick={() => navigate(`${base}/members`)}
        style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={16} /> Back to members
      </button>

      <div className="row row--between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{member.full_name}</h1>
          <p className="page-sub" style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: 14 }}>
            <span className="row" style={{ gap: 6 }}><Mail size={14} /> {member.email}</span>
            {member.phone && <span className="row" style={{ gap: 6 }}><Phone size={14} /> {member.phone}</span>}
            <span className="row" style={{ gap: 6 }}><CalendarDays size={14} /> Joined {formatDate(member.created_at)}</span>
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Badge tone={roleTone[member.role] || "neutral"}>{member.role}</Badge>
          {member.is_active === false
            ? <Badge tone="red">Deactivated</Badge>
            : <Badge tone="green">Active</Badge>}
        </div>
      </div>

      <div className="grid-stats" style={{ margin: "22px 0" }}>
        <StatCard
          tone={summary.atLimit ? "warning" : "active"}
          icon={BookMarked}
          eyebrow="On loan"
          value={`${summary.openLoans}/${summary.borrowLimit}`}
          label={summary.atLimit ? "At borrow limit" : "Books out"}
        />
        <StatCard
          tone={summary.overdueLoans > 0 ? "critical" : "neutral"}
          icon={AlertTriangle}
          eyebrow="Late"
          value={String(summary.overdueLoans)}
          label="Overdue Loans"
        />
        <StatCard
          tone={summary.outstandingFines > 0 ? "warning" : "neutral"}
          icon={Coins}
          eyebrow="Owed"
          value={formatMoney(summary.outstandingFines)}
          label="Outstanding Fines"
        />
        <StatCard tone="neutral" icon={RotateCw} eyebrow="Lifetime" value={String(summary.totalBorrowed)} label="Books Borrowed" />
      </div>

      {/* The one thing the desk needs before scanning anything. */}
      {summary.atLimit && (
        <p className="circ-message circ-message--err">
          ❌ At the borrow limit ({summary.borrowLimit} books). Take a return before checking anything else out.
        </p>
      )}
      {member.is_active === false && (
        <p className="circ-message circ-message--err">
          ❌ This account is deactivated and cannot borrow.
        </p>
      )}

      <Card>
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "loans", label: `Current Loans (${openLoans.length})` },
            { id: "fines", label: `Fines (${unpaidFines.length} unpaid)` },
            { id: "history", label: "History" },
          ]}
        />

        <div style={{ marginTop: 18 }}>
          {tab === "loans" && (
            <DataTable
              columns={[
                { key: "title", header: "Book", render: (l) => l.books?.title || "—" },
                { key: "due", header: "Due", render: (l) => formatDate(l.due_date) },
                { key: "renewals", header: "Renewals", render: (l) => l.renewal_count ?? 0 },
                { key: "status", header: "Status", render: (l) => <StatusBadge status={isLate(l) ? "overdue" : "active"} /> },
                { key: "actions", header: "Actions", render: (l) => (
                  <span className="actions-cell">
                    {/* A renewal is a favour granted before the deadline, not a
                        way to erase one that has passed — the backend refuses
                        an overdue loan, so it isn't offered here either. */}
                    {!isLate(l) && (
                      <button
                        className="act-edit"
                        disabled={busyId === l.id}
                        onClick={() => run(l.id, () => renewLoan(l.id), (r) => r.message || "Loan renewed.")}
                      >
                        <RotateCw size={14} /> Renew
                      </button>
                    )}
                    <button
                      className="act-edit"
                      disabled={busyId === l.id}
                      onClick={() => run(l.id, () => returnBook(l.id), () => `Returned “${l.books?.title || "book"}”.`)}
                    >
                      Return
                    </button>
                  </span>
                ) },
              ]}
              rows={openLoans}
              emptyMessage="Nothing on loan right now."
            />
          )}

          {tab === "fines" && (
            <DataTable
              columns={[
                { key: "amount", header: "Amount", render: (f) => formatMoney(f.amount) },
                { key: "issued", header: "Issued", render: (f) => formatDate(f.issued_at) },
                { key: "notes", header: "Reason", render: (f) => f.notes || "—" },
                { key: "status", header: "Status", render: (f) => <Badge tone={fineTone[f.status]}>{f.status}</Badge> },
                { key: "actions", header: "Actions", render: (f) => f.status !== "unpaid" ? <span>—</span> : (
                  <span className="actions-cell">
                    <button
                      className="act-edit"
                      disabled={busyId === f.id}
                      onClick={() => run(f.id, () => payFine(f.id), () => `Recorded ${formatMoney(f.amount)} as paid.`)}
                    >
                      Mark paid
                    </button>
                    {/* Waiving cancels a debt outright — policy, not desk work.
                        Librarians take payment; only an admin writes one off. */}
                    {canWaiveFines && (
                      <button
                        className="act-remove"
                        disabled={busyId === f.id}
                        onClick={() => run(f.id, () => waiveFine(f.id), () => `Waived ${formatMoney(f.amount)}.`)}
                      >
                        Waive
                      </button>
                    )}
                  </span>
                ) },
              ]}
              rows={fines}
              emptyMessage="No fines on this account."
            />
          )}

          {tab === "history" && (
            <DataTable
              columns={[
                { key: "title", header: "Book", render: (l) => l.books?.title || "—" },
                { key: "author", header: "Author", render: (l) => l.books?.author || "—" },
                { key: "borrowed", header: "Borrowed", render: (l) => formatDate(l.borrow_date) },
                { key: "returned", header: "Returned", render: (l) => formatDate(l.return_date) },
              ]}
              rows={history}
              emptyMessage="No completed loans yet."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
