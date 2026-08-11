// Admin — User Management. Real members (GET /admin/members) with per-row
// role changes and account activation.
import { useState, useEffect } from "react";
import { KeyRound } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getMembers } from "../../services/adminService.js";
import {
  updateMemberRole, deactivateMember, reactivateMember, resetMemberPassword,
} from "../../services/userService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const roleTone = { student: "green", librarian: "gold", admin: "amber" };

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "librarian", label: "Librarian" },
  { value: "admin", label: "Admin" },
];

function EditMemberModal({ member, isSelf, onClose, onSaved }) {
  const toast = useToast();
  const [role, setRole] = useState(member.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const active = member.isActive !== false;

  async function run(action, patch, successMessage) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSaved(patch);
      toast.success(successMessage);
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const handleSaveRole = () => run(() => updateMemberRole(member.id, role), { role }, `${member.name} is now a ${role}.`);
  const handleDeactivate = () => run(() => deactivateMember(member.id), { isActive: false }, `${member.name}'s account was deactivated.`);
  const handleReactivate = () => run(() => reactivateMember(member.id), { isActive: true }, `${member.name}'s account was reactivated.`);

  // Reset keeps the modal open (no state to patch on the row).
  async function handleReset() {
    setBusy(true); setError(null);
    try {
      await resetMemberPassword(member.id);
      toast.success(`Password reset link sent to ${member.email}.`);
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Edit ${member.name}`} onClose={onClose}>
      {error && <p className="field__error" style={{ marginBottom: 12 }}>{error.message}</p>}

      <p className="page-sub" style={{ marginTop: 0 }}>{member.email}</p>

      <Select
        id="member-role"
        label="Role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        options={ROLE_OPTIONS}
        disabled={busy || isSelf}
      />

      {isSelf && (
        <p className="page-sub" style={{ marginTop: 8 }}>
          You can’t change your own role or deactivate your own account.
        </p>
      )}

      <div className="row" style={{ marginTop: 20, gap: 8, flexWrap: "wrap" }}>
        <Button variant="green" onClick={handleSaveRole} loading={busy} disabled={isSelf || role === member.role}>
          {busy ? "Saving…" : "Save Role"}
        </Button>

        <Button variant="outline" onClick={handleReset} disabled={busy}>
          <KeyRound size={15} /> Reset Password
        </Button>

        {active ? (
          <Button variant="danger" onClick={handleDeactivate} disabled={busy || isSelf}>
            Deactivate Account
          </Button>
        ) : (
          <Button variant="outline" onClick={handleReactivate} disabled={busy}>
            Reactivate Account
          </Button>
        )}

        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
      </div>
    </Modal>
  );
}

export default function UserManagementPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try { const m = await getMembers(); if (!cancelled) setMembers(m); }
      catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Patch the edited row in place rather than refetching the whole list.
  function applyChange(memberId, patch) {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, ...patch } : m)));
  }

  const rows = members.filter((m) =>
    (!query || (m.name || "").toLowerCase().includes(query.toLowerCase()) || (m.email || "").toLowerCase().includes(query.toLowerCase())) &&
    (!role || m.role === role));

  return (
    <div>
      <h1 className="page-title">User Management</h1>
      <p className="page-sub">Manage students, librarians, and admins.</p>
      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input placeholder="Search members…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="toolbar__filter">
            <Select value={role} onChange={(e) => setRole(e.target.value)}
              options={[{ value: "", label: "All Roles" }, ...ROLE_OPTIONS]} />
          </div>
        </div>
        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "role", header: "Role", render: (r) => <Badge tone={roleTone[r.role] || "neutral"}>{r.role}</Badge> },
            { key: "status", header: "Status", render: (r) => (
              r.isActive === false
                ? <Badge tone="red">Deactivated</Badge>
                : <Badge tone="green">Active</Badge>
            ) },
            { key: "joined", header: "Join Date" },
            { key: "actions", header: "Actions", render: (r) => (
              <button className="act-edit" onClick={() => setEditing(r)}>Edit</button>
            ) },
          ]}
          rows={rows}
          emptyMessage="No members match your search."
        />
      </Card>

      {editing && (
        <EditMemberModal
          member={editing}
          isSelf={String(editing.id) === String(user?.id)}
          onClose={() => setEditing(null)}
          onSaved={(patch) => applyChange(editing.id, patch)}
        />
      )}
    </div>
  );
}
