// Shared (librarian + admin) — the fines desk.
//
// The `fines` table shipped in the first migration and nothing ever read or
// wrote it: the schema described a feature that did not exist. Fines are now
// issued automatically when a book comes back late, and this is where staff
// settle them.
//
// Librarians record payment. Only admins may waive — cancelling a debt is a
// policy decision, not a desk transaction, and the backend enforces the same
// split on PUT /fines/:id/waive.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, CheckCircle2, Ban } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getFines, payFine, waiveFine, formatMoney } from "../../services/fineService.js";
import { getPolicy } from "../../services/settingsService.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePortal } from "../../hooks/usePortal.js";

const statusTone = { unpaid: "red", paid: "green", waived: "neutral" };

export default function FinesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { base, canWaiveFines } = usePortal();

  const [fines, setFines] = useState([]);
  const [totals, setTotals] = useState({ unpaid: 0, paid: 0, waived: 0 });
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("unpaid");
  const [query, setQuery] = useState("");
  const [settling, setSettling] = useState(null); // { fine, mode: "pay" | "waive" }
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getFines({ status });
      setFines(res.fines);
      setTotals(res.totals);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // Shown in the header so staff can answer "why this amount?" without
    // leaving the screen. Optional — a failure just hides the line.
    getPolicy().then(setPolicy).catch(() => {});
  }, []);

  async function confirmSettle() {
    setBusy(true);
    const { fine, mode } = settling;
    try {
      await (mode === "pay" ? payFine(fine.id, note.trim()) : waiveFine(fine.id, note.trim()));
      toast.success(
        mode === "pay"
          ? `Recorded ${fine.amountLabel} from ${fine.member}.`
          : `Waived ${fine.amountLabel} for ${fine.member}.`
      );
      setSettling(null); setNote("");
      await load();
    } catch (e) {
      toast.error(e.message || "Could not update that fine.");
    } finally {
      setBusy(false);
    }
  }

  const rows = fines.filter((f) =>
    !query
    || f.member.toLowerCase().includes(query.toLowerCase())
    || f.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <h1 className="page-title">Fines</h1>
      <p className="page-sub">
        Charges for late returns.
        {policy && policy.fine_per_day > 0 && (
          <> Currently {formatMoney(policy.fine_per_day)} per day
            {policy.fine_grace_days > 0 && ` after a ${policy.fine_grace_days}-day grace period`}.</>
        )}
        {policy && policy.fine_per_day === 0 && <> Fines are currently switched off in library policy.</>}
      </p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="critical" icon={Coins} eyebrow="Owed" value={formatMoney(totals.unpaid)} label="Outstanding" />
        <StatCard tone="active" icon={CheckCircle2} eyebrow="Collected" value={formatMoney(totals.paid)} label="Paid" />
        <StatCard tone="neutral" icon={Ban} eyebrow="Written off" value={formatMoney(totals.waived)} label="Waived" />
      </div>

      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input
              placeholder="Search member or book…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar__filter">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "unpaid", label: "Unpaid" },
                { value: "paid", label: "Paid" },
                { value: "waived", label: "Waived" },
                { value: "", label: "All" },
              ]}
            />
          </div>
        </div>

        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "member", header: "Member" },
            { key: "title", header: "Book" },
            { key: "due", header: "Was Due" },
            { key: "returned", header: "Returned" },
            { key: "amountLabel", header: "Amount" },
            { key: "status", header: "Status", render: (f) => <Badge tone={statusTone[f.status]}>{f.status}</Badge> },
            { key: "actions", header: "Actions", render: (f) => f.status !== "unpaid" ? <span>—</span> : (
              <span className="actions-cell">
                <button className="act-edit" onClick={() => { setSettling({ fine: f, mode: "pay" }); setNote(""); }}>
                  Mark paid
                </button>
                {canWaiveFines && (
                  <button className="act-remove" onClick={() => { setSettling({ fine: f, mode: "waive" }); setNote(""); }}>
                    Waive
                  </button>
                )}
              </span>
            ) },
          ]}
          rows={rows}
          onRowClick={(f) => f.userId && navigate(`${base}/members/${f.userId}`)}
          emptyMessage={status === "unpaid" ? "Nothing outstanding — everyone's square." : "No fines to show."}
        />
      </Card>

      {settling && (
        <Modal
          title={settling.mode === "pay" ? "Record payment" : "Waive this fine"}
          onClose={() => { setSettling(null); setNote(""); }}
          footer={
            <>
              <Button variant="ghost" onClick={() => { setSettling(null); setNote(""); }}>Cancel</Button>
              <Button
                variant={settling.mode === "pay" ? "green" : "danger"}
                loading={busy}
                onClick={confirmSettle}
              >
                {settling.mode === "pay" ? "Confirm payment" : "Waive fine"}
              </Button>
            </>
          }
        >
          <p>
            {settling.mode === "pay"
              ? <>Record <strong>{settling.fine.amountLabel}</strong> received from <strong>{settling.fine.member}</strong> for “{settling.fine.title}”.</>
              : <>Cancel <strong>{settling.fine.amountLabel}</strong> owed by <strong>{settling.fine.member}</strong> for “{settling.fine.title}”. This is recorded against your account.</>}
          </p>
          <Input
            label="Note (optional)"
            placeholder={settling.mode === "pay" ? "Receipt number, paid in cash…" : "Reason for waiving"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Modal>
      )}
    </div>
  );
}
