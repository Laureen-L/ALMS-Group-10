// Librarian — Members. Searchable list of library members with status.
// MOCK data; wire to userService.getMembers() later.
import { useState } from "react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import DataTable from "../../components/tables/DataTable.jsx";

const MEMBERS = [
  { id: "#29401", name: "Ama Serwaa", email: "serwaa.a@knust.edu.gh", role: "Student", joined: "12 Oct 2023", status: "Active" },
  { id: "#28312", name: "Kofi Owusu", email: "owusu.k@knust.edu.gh", role: "Librarian", joined: "05 Sep 2023", status: "Active" },
  { id: "#27551", name: "Dr. Isaac Manu", email: "manu.i@knust.edu.gh", role: "Admin", joined: "15 Aug 2023", status: "Suspended" },
  { id: "#26120", name: "Efua Addo", email: "addo.e@knust.edu.gh", role: "Student", joined: "02 Aug 2023", status: "Active" },
];

const roleTone = { Student: "green", Librarian: "gold", Admin: "amber" };

export default function MembersPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");

  const rows = MEMBERS.filter((m) =>
    (!query || m.name.toLowerCase().includes(query.toLowerCase()) || m.email.toLowerCase().includes(query.toLowerCase())) &&
    (!role || m.role === role)
  );

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
              options={[{ value: "", label: "All Roles" }, "Student", "Librarian", "Admin"]} />
          </div>
        </div>

        <DataTable
          columns={[
            { key: "id", header: "User ID" },
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "role", header: "Role", render: (r) => <Badge tone={roleTone[r.role] || "neutral"}>{r.role}</Badge> },
            { key: "joined", header: "Join Date" },
            { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "Active" ? "green" : "red"}>{r.status}</Badge> },
            { key: "actions", header: "Actions", render: (r) => (
              <span className="actions-cell">
                <button className="act-edit">Edit</button>
                <button className="act-remove">{r.status === "Active" ? "Suspend" : "Activate"}</button>
              </span>
            ) },
          ]}
          rows={rows}
          emptyMessage="No members match your search."
        />
      </Card>
    </div>
  );
}