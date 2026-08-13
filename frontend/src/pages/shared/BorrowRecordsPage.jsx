// Shared (librarian + admin) — every loan in the system.
//
// This was two screens: the librarian's "Borrowing Activity" and the admin's
// "Borrow Records". They read the same endpoint and rendered the same rows;
// the librarian's simply lacked the status filter and the return-date column,
// so it was a strictly worse copy of the other. One screen now, with the
// heading wording each portal used.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import Pagination from "../../components/tables/Pagination.jsx";
import { getBorrowRecords } from "../../services/adminService.js";
import { usePortal } from "../../hooks/usePortal.js";

const PER_PAGE = 10;

export default function BorrowRecordsPage() {
  const navigate = useNavigate();
  const { base, isAdmin } = usePortal();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try { const r = await getBorrowRecords(); if (!cancelled) setRecords(r); }
      catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = records.filter((r) =>
    (!query
      || r.title.toLowerCase().includes(query.toLowerCase())
      || String(r.member).toLowerCase().includes(query.toLowerCase()))
    && (!status || r.status === status));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <h1 className="page-title">{isAdmin ? "Borrow Records" : "Borrowing Activity"}</h1>
      <p className="page-sub">Every borrow and return across the library.</p>
      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input
              placeholder="Search member or book…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          </div>
          <div className="toolbar__filter">
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              options={[
                { value: "", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "overdue", label: "Overdue" },
                { value: "returned", label: "Returned" },
              ]}
            />
          </div>
        </div>
        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "member", header: "Member" },
            { key: "title", header: "Book Title" },
            { key: "borrowed", header: "Borrow Date" },
            { key: "due", header: "Due Date" },
            { key: "returned", header: "Return Date" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={rows}
          // A record is only ever a starting point — the useful next question
          // is always about the member, not the row.
          onRowClick={(r) => r.userId && navigate(`${base}/members/${r.userId}`)}
          emptyMessage="No records match your search."
        />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
