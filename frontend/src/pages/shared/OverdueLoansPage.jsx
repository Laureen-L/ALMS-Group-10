// Shared (librarian + admin) — overdue loans, and what to do about them.
//
// This replaces three screens that all listed the same rows: the librarian's
// "Overdue Management" (which had the reminder actions), a shared "Overdue
// Loans" detail reached from a dashboard stat card (which had the days-overdue
// column), and a third copy as a tab on the librarian dashboard. Three views
// of one list is impossible to explain in a demo, so this is the one screen —
// the actions from the first, the arithmetic from the second.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Send, Clock } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import { getOverdue } from "../../services/adminService.js";
import { sendOverdueReminders } from "../../services/reportService.js";
import { summarizeReminderRun, summarizeSingleReminder } from "../../utils/reminderSummary.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePortal } from "../../hooks/usePortal.js";

// Whole days since the due date passed.
function daysOverdue(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  return Math.max(0, Math.floor((new Date() - due) / (1000 * 60 * 60 * 24)));
}

export default function OverdueLoansPage() {
  const navigate = useNavigate();
  const { base } = usePortal();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [remindingId, setRemindingId] = useState(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [smsResult, setSmsResult] = useState(null); // { type, text }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try { const r = await getOverdue(); if (!cancelled) setRows(r); }
      catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function remindOne(loan) {
    setRemindingId(loan.id);
    try {
      // Shared with the other screens that trigger reminders, so the same
      // result can't be described three different ways.
      const { tone, text } = summarizeSingleReminder(await sendOverdueReminders(loan.id), loan.member);
      toast[tone](text);
    } catch (e) {
      toast.error(e.message || "Reminder could not be sent.");
    } finally {
      setRemindingId(null);
    }
  }

  async function sendAll() {
    setConfirmBulk(false);
    setSending(true);
    setSmsResult(null);
    try {
      setSmsResult(summarizeReminderRun(await sendOverdueReminders()));
    } catch (e) {
      setSmsResult({ type: "err", text: e.message || "Couldn’t send reminders." });
    } finally {
      setSending(false);
    }
  }

  const worst = rows.reduce((max, r) => Math.max(max, daysOverdue(r.dueRaw || r.due) ?? 0), 0);

  return (
    <div>
      <h1 className="page-title">Overdue Loans</h1>
      <p className="page-sub">Every loan past its due date, how far past, and who to chase.</p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="critical" icon={AlertTriangle} eyebrow="Action" value={String(rows.length)} label="Overdue Loans" />
        <StatCard tone="warning" icon={Clock} eyebrow="Worst" value={worst ? `${worst}d` : "—"} label="Longest Overdue" />
      </div>

      {rows.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <AlertBanner
            tone="danger"
            message={`${rows.length} loan${rows.length === 1 ? "" : "s"} need a reminder.`}
            action={
              <Button variant="outline" style={{ background: "#fff" }} onClick={() => setConfirmBulk(true)} disabled={sending}>
                <Send size={16} /> {sending ? "Sending…" : "Send All Reminders"}
              </Button>
            }
          />
        </div>
      )}

      {smsResult && <p className={`circ-message circ-message--${smsResult.type}`}>{smsResult.text}</p>}

      <Card title="Details">
        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "member", header: "Member" },
            { key: "title", header: "Book" },
            { key: "due", header: "Due Date" },
            { key: "daysOverdue", header: "Days Overdue", render: (r) => {
              const days = daysOverdue(r.dueRaw || r.due);
              return days === null
                ? <span>—</span>
                : <span style={{ color: "var(--red-600)", fontWeight: 600 }}>{days} {days === 1 ? "day" : "days"}</span>;
            } },
            { key: "status", header: "Status", render: () => <StatusBadge status="overdue" /> },
            { key: "actions", header: "Action", render: (r) => (
              <button className="act-edit" disabled={remindingId === r.id} onClick={() => remindOne(r)}>
                <Send size={14} /> {remindingId === r.id ? "Sending…" : "Remind"}
              </button>
            ) },
          ]}
          rows={rows}
          onRowClick={(r) => r.userId && navigate(`${base}/members/${r.userId}`)}
          emptyMessage="Nothing overdue — nice."
        />
      </Card>

      {/* A per-row reminder is routine. This one messages every overdue member
          at once and spends SMS credit, so it asks first — and the backend
          records it in the audit log either way. */}
      {confirmBulk && (
        <Modal
          title="Remind everyone?"
          onClose={() => setConfirmBulk(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmBulk(false)}>Cancel</Button>
              <Button variant="danger" onClick={sendAll}>Send {rows.length} reminder(s)</Button>
            </>
          }
        >
          <p>
            This notifies all <strong>{rows.length}</strong> members with an overdue loan, in the app
            and by SMS where a number is on file. It is recorded against your account.
          </p>
        </Modal>
      )}
    </div>
  );
}
