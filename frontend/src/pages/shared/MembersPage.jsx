// Shared (librarian + admin) — the member list.
//
// Replaces the librarian's read-only "Members" and the admin's "User
// Management", which were the same table with the same filters. They differed
// only in whether each row could be edited, so that is now a permission check
// rather than a second copy of the screen.
//
// Both roles get the link into member detail, which is the part that was
// missing: this list is a directory, and the desk's real work happens one
// member at a time.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Users, UserCheck, UserX } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getMembers, inviteMember } from "../../services/adminService.js";
import { updateMemberRole, deactivateMember, reactivateMember } from "../../services/userService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { usePortal } from "../../hooks/usePortal.js";
import { validateEmail, validateRequired } from "../../utils/validators.js";

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

/**
 * Creating a member of staff.
 *
 * Sends an invitation rather than setting a password: an administrator should
 * never choose, see, or transmit someone else's credentials. Supabase emails a
 * one-time link and the invitee sets their own on the reset-password screen.
 *
 * Before this the only way to get a librarian account was for the person to
 * sign up as a student and then be promoted.
 */
function InviteModal({ onClose, onInvited }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("librarian");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const next = {
      email: validateEmail(email),
      fullName: validateRequired(fullName, "Full name"),
    };
    setErrors(next);
    if (next.email || next.fullName) return;

    setBusy(true);
    try {
      await inviteMember({ email: email.trim(), fullName: fullName.trim(), role });
      toast.success(`Invitation sent to ${email.trim()}.`);
      onInvited();
      onClose();
    } catch (err) {
      setErrors({ form: err.message || "Could not send that invitation." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Invite a member of staff" onClose={onClose}>
      <form onSubmit={submit}>
        {errors.form && <p className="field__error" style={{ marginBottom: 12 }}>{errors.form}</p>}

        <Input
          id="invite-name" label="Full name" placeholder="Ama Serwaa"
          value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName}
        />
        <Input
          id="invite-email" label="Email" type="email" placeholder="ama@knust.edu.gh"
          value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email}
        />
        <Select
          id="invite-role" label="Role" value={role}
          onChange={(e) => setRole(e.target.value)} options={ROLE_OPTIONS}
        />

        <p className="page-sub" style={{ marginTop: 12 }}>
          They’ll get an email with a one-time link and choose their own password. You never see it.
        </p>

        <div className="row" style={{ marginTop: 20, gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="green" loading={busy}>Send invitation</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function MembersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { base, canManageMembers } = usePortal();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const [inviting, setInviting] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try { setMembers(await getMembers()); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // Patch the edited row in place rather than refetching the whole list.
  function applyChange(memberId, patch) {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, ...patch } : m)));
  }

  const rows = members.filter((m) =>
    (!query
      || (m.name || "").toLowerCase().includes(query.toLowerCase())
      || (m.email || "").toLowerCase().includes(query.toLowerCase()))
    && (!role || m.role === role)
    && (!status
      || (status === "active" && m.isActive !== false)
      || (status === "deactivated" && m.isActive === false)));

  const deactivated = members.filter((m) => m.isActive === false).length;
  const staff = members.filter((m) => m.role !== "student").length;

  return (
    <div>
      <div className="row row--between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">{canManageMembers ? "User Management" : "Members"}</h1>
          <p className="page-sub">Everyone registered with the library.</p>
        </div>
        {canManageMembers && (
          <Button variant="green" onClick={() => setInviting(true)}>
            <UserPlus size={16} /> Invite Staff
          </Button>
        )}
      </div>

      <div className="grid-stats" style={{ margin: "18px 0 22px" }}>
        <StatCard tone="active" icon={Users} eyebrow="Registered" value={String(members.length)} label="Total Members" />
        <StatCard tone="neutral" icon={UserCheck} eyebrow="Staff" value={String(staff)} label="Librarians & Admins" />
        <StatCard
          tone={deactivated > 0 ? "warning" : "neutral"}
          icon={UserX}
          eyebrow="Disabled"
          value={String(deactivated)}
          label="Deactivated Accounts"
          // Deactivated accounts were invisible once filtered out of the list;
          // this is the way back to them.
          onClick={() => setStatus(status === "deactivated" ? "" : "deactivated")}
          hint={status === "deactivated" ? "Showing — click to clear" : "Click to filter"}
        />
      </div>

      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input placeholder="Search members…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="toolbar__filter">
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[{ value: "", label: "All Roles" }, ...ROLE_OPTIONS]}
            />
          </div>
          <div className="toolbar__filter">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "", label: "All Accounts" },
                { value: "active", label: "Active" },
                { value: "deactivated", label: "Deactivated" },
              ]}
            />
          </div>
        </div>

        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "role", header: "Role", render: (r) => <Badge tone={roleTone[r.role] || "neutral"}>{r.role}</Badge> },
            { key: "status", header: "Status", render: (r) => (
              r.isActive === false ? <Badge tone="red">Deactivated</Badge> : <Badge tone="green">Active</Badge>
            ) },
            { key: "joined", header: "Join Date" },
            { key: "actions", header: "Actions", render: (r) => (
              <span className="actions-cell">
                <button className="act-edit" onClick={() => navigate(`${base}/members/${r.id}`)}>View</button>
                {canManageMembers && (
                  <button className="act-edit" onClick={() => setEditing(r)}>Edit</button>
                )}
              </span>
            ) },
          ]}
          rows={rows}
          onRowClick={(r) => navigate(`${base}/members/${r.id}`)}
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

      {inviting && <InviteModal onClose={() => setInviting(false)} onInvited={load} />}
    </div>
  );
}
