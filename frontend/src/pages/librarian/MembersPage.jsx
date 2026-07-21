// Librarian — Members. Real members list (GET /admin/members).
import { useState, useEffect } from "react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getMembers } from "../../services/adminService.js";

const roleTone = { student: "green", librarian: "gold", admin: "amber" };

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");

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

  const rows = members.filter((m) =>
    (!query || (m.name || "").toLowerCase().includes(query.toLowerCase()) || (m.email || "").toLowerCase().includes(query.toLowerCase())) &&
    (!role || m.role === role));

  return (
    <div>
      <h1 className="page-title">Members</h1>
      <p className="page-sub">Everyone registered with the library.</p>
      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input placeholder="Search members…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="toolbar__filter">
            <Select value={role} onChange={(e) => setRole(e.target.value)}
              options={[{ value: "", label: "All Roles" }, { value: "student", label: "Student" }, { value: "librarian", label: "Librarian" }, { value: "admin", label: "Admin" }]} />
          </div>
        </div>
        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "role", header: "Role", render: (r) => <Badge tone={roleTone[r.role] || "neutral"}>{r.role}</Badge> },
            { key: "joined", header: "Join Date" },
          ]}
          rows={rows}
          emptyMessage="No members match your search."
        />
      </Card>
    </div>
  );
}