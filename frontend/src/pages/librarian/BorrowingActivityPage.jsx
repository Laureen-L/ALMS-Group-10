// Librarian — Borrowing Activity log. Filterable table of borrow/return events.
// MOCK data; wire to borrowService.getActivity() later.
import { useState } from "react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import Pagination from "../../components/tables/Pagination.jsx";

const LOG = [
  { id: "BR-1029", member: "Ama Serwaa", title: "Modern Algorithms in Java", action: "Borrow", date: "Oct 12, 2023", status: "active" },
  { id: "BR-1024", member: "Kwame Mensah", title: "Intro to Quantum Computing", action: "Borrow", date: "Sep 20, 2023", status: "overdue" },
  { id: "BR-1012", member: "Abena Fosua", title: "Data Structures 101", action: "Return", date: "Sep 01, 2023", status: "returned" },
  { id: "BR-1004", member: "Yaw Boateng", title: "Organic Chemistry Vol II", action: "Borrow", date: "Aug 28, 2023", status: "due_soon" },
  { id: "BR-0999", member: "Efua Addo", title: "Linear Algebra", action: "Return", date: "Aug 15, 2023", status: "returned" },
];

const PER_PAGE = 4;

export default function BorrowingActivityPage() {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const filtered = LOG.filter((r) =>
    (!query || r.member.toLowerCase().includes(query.toLowerCase()) || r.title.toLowerCase().includes(query.toLowerCase())) &&
    (!action || r.action === action)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <h1 className="page-title">Borrowing Activity</h1>
      <p className="page-sub">Every borrow and return across the library.</p>

      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input placeholder="Search member or book…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <div className="toolbar__filter">
            <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
              options={[{ value: "", label: "All Actions" }, "Borrow", "Return"]} />
          </div>
        </div>

        <DataTable
          columns={[
            { key: "id", header: "Record ID" },
            { key: "member", header: "Member" },
            { key: "title", header: "Book Title" },
            { key: "action", header: "Action" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={rows}
          emptyMessage="No activity matches your filters."
        />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}