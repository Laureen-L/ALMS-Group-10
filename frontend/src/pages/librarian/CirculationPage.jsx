// Librarian — Circulation Desk. Scan an ISBN to check a book out to a member,
// or to take one back. The ISBN field keeps focus so a barcode scanner can
// drive the whole screen without touching the mouse.
import { useState, useRef } from "react";
import { BookUp, BookDown, UserSearch } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { checkOutByIsbn, returnByIsbn } from "../../services/borrowService.js";
import { lookupMember } from "../../services/userService.js";
import { useToast } from "../../context/ToastContext.jsx";

const MAX_ACTIVITY_ROWS = 10;

export default function CirculationPage() {
  const isbnRef = useRef(null);
  const toast = useToast();
  const [isbn, setIsbn] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [message, setMessage] = useState(null); // { type: "ok" | "err", text }
  const [busy, setBusy] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [member, setMember] = useState(null); // confirmed member from lookup
  const [lookingUp, setLookingUp] = useState(false);

  // Confirm who the book is going to before committing the loan.
  async function handleLookup() {
    const email = memberEmail.trim();
    if (!email || lookingUp) return;
    setLookingUp(true);
    setMessage(null);
    setMember(null);
    try {
      const found = await lookupMember(email);
      if (found.is_active === false) {
        setMessage({ type: "err", text: `${found.full_name}'s account is deactivated.` });
      } else {
        setMember(found);
        setMessage({ type: "ok", text: `Member confirmed: ${found.full_name} (${found.role}).` });
      }
    } catch (e) {
      setMessage({ type: "err", text: e.message || "Member not found." });
    } finally {
      setLookingUp(false);
    }
  }

  function logActivity(action, email) {
    setRecentActivity((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        action,
        isbn,
        member: email || "—",
        time: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, MAX_ACTIVITY_ROWS - 1),
    ]);
  }

  async function runTransaction(action, fn, clearEmail) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fn();
      const text = res?.message || `${action} successful.`;
      setMessage({ type: "ok", text });
      toast.success(text);
      logActivity(action, memberEmail);
      setIsbn("");
      if (clearEmail) { setMemberEmail(""); setMember(null); }
    } catch (e) {
      const text = e.message || `${action} failed.`;
      setMessage({ type: "err", text });
      toast.error(text);
    } finally {
      setBusy(false);
      isbnRef.current?.focus();
    }
  }

  const handleCheckOut = () =>
    runTransaction("Check out", () => checkOutByIsbn(isbn.trim(), memberEmail.trim()), true);

  const handleReturn = () =>
    runTransaction("Return", () => returnByIsbn(isbn.trim()), false);

  return (
    <div className="circulation-desk">
      <h1 className="page-title">Circulation Desk</h1>
      <p className="page-sub">Check books out to members and take returns.</p>

      {message && (
        <p className={`circ-message circ-message--${message.type === "ok" ? "ok" : "err"}`}>
          {message.type === "ok" ? "✅" : "❌"} {message.text}
        </p>
      )}

      <Card>
        {/* Enter submits a check-out — the common case at a busy desk. */}
        <form
          className="circulation-form"
          onSubmit={(e) => { e.preventDefault(); handleCheckOut(); }}
        >
          <div className="circulation-form__field">
            <Input
              ref={isbnRef}
              autoFocus
              label="ISBN"
              placeholder="Scan or type ISBN…"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
            />
          </div>
          <div className="circulation-form__field">
            <Input
              label="Member email"
              type="email"
              placeholder="Required for check out"
              value={memberEmail}
              // A new email invalidates the previously confirmed member.
              onChange={(e) => { setMemberEmail(e.target.value); setMember(null); }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={handleLookup}
            disabled={lookingUp || !memberEmail.trim()}
          >
            <UserSearch size={16} /> {lookingUp ? "Looking up…" : "Look Up"}
          </Button>
          <Button type="submit" variant="green" disabled={busy || !isbn.trim() || !memberEmail.trim()}>
            <BookUp size={16} /> {busy ? "Working…" : "Check Out"}
          </Button>
          <Button type="button" variant="outline" onClick={handleReturn} disabled={busy || !isbn.trim()}>
            <BookDown size={16} /> Return
          </Button>
        </form>

        {member && (
          <p className="page-sub" style={{ marginTop: 12, marginBottom: 0 }}>
            Checking out to <strong>{member.full_name}</strong> — {member.email}
          </p>
        )}
      </Card>

      <div style={{ marginTop: 22 }}>
        <Card title="Recent Activity">
          <DataTable
            columns={[
              { key: "action", header: "Action" },
              { key: "isbn", header: "ISBN" },
              { key: "member", header: "Member" },
              { key: "time", header: "Time" },
            ]}
            rows={recentActivity}
            emptyMessage="No transactions yet this session."
          />
        </Card>
      </div>
    </div>
  );
}
