// IT — User Accounts. Full account control: role, enable/disable, reset password.
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

const roleTone = { student: "green", librarian: "gold", admin: "amber", it: "neutral" };

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "librarian", label: "Librarian" },
  { value: "admin", label: "Admin" },
  { value: "it", label: "IT" },
];

function EditAccountModal({ member, isSelf, onClose, onSaved }) {
  const toast = useToast();
  const [role, setRole] = useState(member.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const active = member.isActive !== false;

  async function run(action, patch, successMessage, close = true) {
    setBusy(true); setError(null);
    try {
      await action();
      if (patch) onSaved(patch);
      toast.success(successMessage);
      if (close) onClose();
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  }

  const saveRole = () => run(() => updateMemberRole(member.id, role), { role }, `${member.name} is now ${role}.`);
  const deactivate = () => run(() => deactivateMember(member.id), { isActive: false }, `${member.name}'s account was disabled.`);
  const reactivate = () => run(() => reactivateMember(member.id), { isActive: true }, `${member.name}'s account was enabled.`);
  const reset = () => run(() => resetMemberPassword(member.id), null, `Password reset link sent to ${member.email}.`, false);

  return (
    <Modal title={`Account · ${member.name}`} onClose={onClose}>
      {error && <p className="field__error" style={{ marginBottom: 12 }}>{error.message}</p>}
      <p className="page-sub" style={{ marginTop: 0 }}>{member.email}</p>

      <Select id="acct-role" label="Role" value={role}
        onChange={(e) => setRole(e.target.value)} options={ROLE_OPTIONS} disabled={busy || isSelf} />

      {isSelf && (
        <p className="page-sub" style={{ marginTop: 8 }}>
          You can’t change your own role or disable your own account.
        </p>
      )}

      <div className="row" style={{ marginTop: 20, gap: 8, flexWrap: "wrap" }}>
        <Button variant="green" onClick={saveRole} disabled={busy || isSelf || role === member.role}>
          {busy ? "Saving…" : "Save Role"}
        </Button>
        <Button variant="outline" onClick={reset} disabled={busy}>
          <KeyRound size={15} /> Reset Password
        </Button>
        {active ? (
          <Button variant="danger" onClick={deactivate} disabled={busy || isSelf}>Disable</Button>
        ) : (
          <Button variant="outline" onClick={reactivate} disabled={busy}>Enable</Button>
        )}
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
      </div>
    </Modal>
  );
}

export default function ITUserManagementPage() {
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

  function applyChange(memberId, patch) {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, ...patch } : m)));
  }

  const rows = members.filter((m) =>
    (!query || (m.name || "").toLowerCase().includes(query.toLowerCase()) || (m.email || "").toLowerCase().includes(query.toLowerCase())) &&
    (!role || m.role === role));

  return (
    <div>
      <h1 className="page-title">User Accounts</h1>
      <p className="page-sub">Manage every account — roles, access, and password resets.</p>
      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input placeholder="Search accounts…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
              r.isActive === false ? <Badge tone="red">Disabled</Badge> : <Badge tone="green">Active</Badge>
            ) },
            { key: "joined", header: "Join Date" },
            { key: "actions", header: "Actions", render: (r) => (
              <button className="act-edit" onClick={() => setEditing(r)}>Manage</button>
            ) },
          ]}
          rows={rows}
          emptyMessage="No accounts match your search."
        />
      </Card>

      {editing && (
        <EditAccountModal
          member={editing}
          isSelf={String(editing.id) === String(user?.id)}
          onClose={() => setEditing(null)}
          onSaved={(patch) => applyChange(editing.id, patch)}
        />
      )}
    </div>
  );
}
