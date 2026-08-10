// Librarian — Overdue Management. Real overdue records (GET /admin/overdue).
import { useState, useEffect } from "react";
import { AlertTriangle, Send } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import { getOverdue } from "../../services/adminService.js";
import { sendOverdueReminders } from "../../services/reportService.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function OverdueManagementPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [remindingId, setRemindingId] = useState(null);
  const toast = useToast();
  const [smsResult, setSmsResult] = useState(null); // { type, text }

  async function remindOne(loan) {
    setRemindingId(loan.id);
    try {
      const res = await sendOverdueReminders(loan.id);
      if (res.remindersSent > 0) toast.success(`Reminder sent to ${loan.member}.`);
      else if (res.skipped?.length) toast.info(`${loan.member} has no phone number on file.`);
      else toast.error(res.failed?.[0]?.reason || "Reminder could not be sent.");
    } catch (e) {
      toast.error(e.message || "Reminder could not be sent.");
    } finally {
      setRemindingId(null);
    }
  }

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

  return (
    <div>
      <h1 className="page-title">Overdue Management</h1>
      <p className="page-sub">Loans past their due date.</p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="critical" icon={AlertTriangle} eyebrow="Action" value={String(rows.length)} label="Overdue Loans" />
      </div>

      {rows.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <AlertBanner tone="danger" message={`${rows.length} loans need a reminder.`}
            action={
              <Button variant="outline" style={{ background: "#fff" }} onClick={onSendReminders} disabled={sending}>
                <Send size={16} /> {sending ? "Sending…" : "Send All Reminders"}
              </Button>
            } />
        </div>
      )}

      {smsResult && (
        <p className={`circ-message circ-message--${smsResult.type}`}>{smsResult.text}</p>
      )}

      <Card title="Overdue Loans">
        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "member", header: "Member" },
            { key: "title", header: "Book Title" },
            { key: "due", header: "Due Date" },
            { key: "status", header: "Status", render: () => <StatusBadge status="overdue" /> },
            { key: "actions", header: "Action", render: (r) => (
              <button className="act-edit" disabled={remindingId === r.id} onClick={() => remindOne(r)}>
                <Send size={14} /> {remindingId === r.id ? "Sending…" : "Remind"}
              </button>
            ) },
          ]}
          rows={rows}
          emptyMessage="Nothing overdue — nice."
        />
      </Card>
    </div>
  );
}