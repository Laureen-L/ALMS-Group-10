// Admin — Borrow Records. Real records (GET /admin/borrow-records).
import { useState, useEffect } from "react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import Pagination from "../../components/tables/Pagination.jsx";
import { getBorrowRecords } from "../../services/adminService.js";

const PER_PAGE = 10;

export default function BorrowRecordsPage() {
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
    (!query || r.title.toLowerCase().includes(query.toLowerCase()) || String(r.member).toLowerCase().includes(query.toLowerCase())) &&
    (!status || r.status === status));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <h1 className="page-title">Borrow Records</h1>
      <p className="page-sub">Every loan in the system.</p>
      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input placeholder="Search member or book…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <div className="toolbar__filter">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              options={[{ value: "", label: "All Status" }, { value: "active", label: "Active" }, { value: "overdue", label: "Overdue" }, { value: "returned", label: "Returned" }]} />
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
          emptyMessage="No records match your search."
        />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}