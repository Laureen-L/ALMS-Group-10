// Admin — Borrow Records (full list).
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Eye, Search } from "lucide-react";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Select from "../../components/ui/Select.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import { BORROW_STATUS, BORROW_STATUS_META } from "../../constants/borrowStatus.js";
import { downloadCsv } from "../../utils/export.js";
import "../../styles/globals.css";

const PAGE_SIZE = 5;

const STATUS_OPTIONS = ["All Statuses", "Active", "Overdue", "Returned"];

const STATUS_FILTER_MAP = {
  Active: BORROW_STATUS.ACTIVE,
  Overdue: BORROW_STATUS.OVERDUE,
  Returned: BORROW_STATUS.RETURNED,
};

const BASE_RECORDS = [
  {
    borrower: "Dr. Kwame Osei",
    borrowerDetail: "Faculty - Engineering",
    book: "Advanced Structural Mechanics",
    isbn: "978-3-16-148410-0",
    borrowedOn: "2023-10-15",
    dueDate: "2023-11-15",
    returnedOn: null,
    status: BORROW_STATUS.ACTIVE,
  },
  {
    borrower: "Ama Mensah",
    borrowerDetail: "Student - CompSci",
    book: "Introduction to Algorithms",
    isbn: "978-0-262-03384-8",
    borrowedOn: "2023-09-01",
    dueDate: "2023-09-15",
    returnedOn: null,
    status: BORROW_STATUS.OVERDUE,
  },
  {
    borrower: "Prof. Yaa Asantewaa",
    borrowerDetail: "Faculty - History",
    book: "The History of West Africa",
    isbn: "978-1-847-01034-7",
    borrowedOn: "2023-10-01",
    dueDate: "2023-11-01",
    returnedOn: "2023-10-28",
    status: BORROW_STATUS.RETURNED,
  },
  {
    borrower: "Kofi Annan",
    borrowerDetail: "Student - PoliSci",
    book: "Global Governance Patterns",
    isbn: "978-0-19-882894-4",
    borrowedOn: "2023-10-20",
    dueDate: "2023-11-20",
    returnedOn: null,
    status: BORROW_STATUS.ACTIVE,
  },
  {
    borrower: "Akosua Serwaa",
    borrowerDetail: "Staff - Administration",
    book: "Effective Management Strategies",
    isbn: "978-1-119-39148-5",
    borrowedOn: "2023-09-10",
    dueDate: "2023-10-10",
    returnedOn: "2023-10-05",
    status: BORROW_STATUS.RETURNED,
  },
];

function buildAllRecords() {
  const statusPool = [
    ...Array(38).fill(BORROW_STATUS.ACTIVE),
    ...Array(2).fill(BORROW_STATUS.OVERDUE),
    ...Array(102).fill(BORROW_STATUS.RETURNED),
  ];

  return statusPool.map((status, index) => {
    const base = BASE_RECORDS[index % BASE_RECORDS.length];
    const month = String((index % 12) + 1).padStart(2, "0");
    const day = String((index % 28) + 1).padStart(2, "0");
    const isReturned = status === BORROW_STATUS.RETURNED;

    return {
      ...base,
      id: `BR-${8492 - index}`,
      status,
      borrowedOn: `2023-${month}-${day}`,
      dueDate: `2023-${month}-${String(Math.min(Number(day) + 14, 28)).padStart(2, "0")}`,
      returnedOn: isReturned ? `2023-${month}-${String(Math.min(Number(day) + 10, 28)).padStart(2, "0")}` : null,
    };
  });
}

const ALL_BORROW_RECORDS = buildAllRecords();

const MONO = { fontFamily: "monospace", fontSize: 13 };

const CSV_HEADERS = [
  "ID",
  "Borrower",
  "Borrower Detail",
  "Book Title",
  "ISBN",
  "Borrowed On",
  "Due Date",
  "Returned On",
  "Status",
];

function recordToCsvRow(record) {
  return [
    record.id,
    record.borrower,
    record.borrowerDetail,
    record.book,
    record.isbn,
    record.borrowedOn,
    record.dueDate,
    record.returnedOn ?? "",
    BORROW_STATUS_META[record.status]?.label ?? record.status,
  ];
}

function buildColumns(onView) {
  return [
    {
      key: "id",
      header: "# ID",
      render: (row) => (
        <span style={{ ...MONO, color: "var(--muted)" }}>{row.id}</span>
      ),
    },
    {
      key: "borrower",
      header: "Borrower",
      render: (row) => (
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>{row.borrower}</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
            {row.borrowerDetail}
          </p>
        </div>
      ),
    },
    {
      key: "book",
      header: "Book Title",
      render: (row) => (
        <div>
          <p style={{ margin: 0 }}>{row.book}</p>
          <p style={{ margin: "4px 0 0", ...MONO, fontSize: 12, color: "var(--muted)" }}>
            ISBN: {row.isbn}
          </p>
        </div>
      ),
    },
    {
      key: "borrowedOn",
      header: "Borrowed On",
      render: (row) => <span style={MONO}>{row.borrowedOn}</span>,
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (row) => (
        <span
          style={{
            ...MONO,
            fontWeight: row.status === BORROW_STATUS.OVERDUE ? 700 : 400,
            color: row.status === BORROW_STATUS.OVERDUE ? "var(--red-600)" : "inherit",
          }}
        >
          {row.dueDate}
        </span>
      ),
    },
    {
      key: "returnedOn",
      header: "Returned On",
      render: (row) => (
        <span style={{ ...MONO, color: "var(--muted)" }}>
          {row.returnedOn ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div style={{ textAlign: "right" }}>
          <StatusBadge status={row.status} />
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button variant="outline" size="sm" onClick={() => onView(row)} aria-label={`View ${row.id}`}>
            <Eye size={14} />
            View
          </Button>
        </div>
      ),
    },
  ];
}

function countByStatus(records, status) {
  return records.filter((record) => record.status === status).length;
}

export default function BorrowRecordsPage() {
  const location = useLocation();
  const initialStatus =
    location.state?.statusFilter &&
    STATUS_OPTIONS.includes(location.state.statusFilter)
      ? location.state.statusFilter
      : "All Statuses";

  const [records, setRecords] = useState(ALL_BORROW_RECORDS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        !query ||
        record.borrower.toLowerCase().includes(query) ||
        record.book.toLowerCase().includes(query) ||
        record.id.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All Statuses" ||
        record.status === STATUS_FILTER_MAP[statusFilter];
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

  const summary = useMemo(
    () => [
      { label: "Total Records", value: String(records.length), tone: "neutral" },
      { label: "Active", value: String(countByStatus(records, BORROW_STATUS.ACTIVE)), tone: "green" },
      { label: "Overdue", value: String(countByStatus(records, BORROW_STATUS.OVERDUE)), tone: "red" },
      { label: "Returned", value: String(countByStatus(records, BORROW_STATUS.RETURNED)), tone: "neutral" },
    ],
    [records],
  );

  const overdueCount = countByStatus(records, BORROW_STATUS.OVERDUE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All Statuses");
    setPage(1);
  };

  const handleExportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `borrow-records-${stamp}.csv`,
      CSV_HEADERS,
      filteredRecords.map(recordToCsvRow),
    );
  };

  const showOverdueOnly = () => {
    setStatusFilter("Overdue");
    setPage(1);
  };

  const handleMarkReturned = (record) => {
    if (record.status === BORROW_STATUS.RETURNED) return;

    const returnedOn = new Date().toISOString().slice(0, 10);
    setRecords((prev) =>
      prev.map((entry) =>
        entry.id === record.id
          ? { ...entry, status: BORROW_STATUS.RETURNED, returnedOn }
          : entry,
      ),
    );
    setSelectedRecord((prev) =>
      prev && prev.id === record.id
        ? { ...prev, status: BORROW_STATUS.RETURNED, returnedOn }
        : prev,
    );
    setNotice(`${record.book} marked as returned.`);
  };

  const rangeStart = filteredRecords.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredRecords.length);

  const columns = useMemo(() => buildColumns(setSelectedRecord), []);

  return (
    <div className="stack">
      <header className="row row--between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Borrow Records</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Full transaction log — all users, all books
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCsv} disabled={filteredRecords.length === 0}>
          <Download size={18} />
          Export CSV
        </Button>
      </header>

      {notice && <AlertBanner tone="info" message={notice} />}

      {overdueCount > 0 && (
        <AlertBanner
          message={`${overdueCount} borrow record(s) are currently overdue.`}
          action={
            <Button variant="ghost" size="sm" onClick={showOverdueOnly} style={{ color: "#fff" }}>
              View overdue
            </Button>
          }
        />
      )}

      <div
        className="row"
        style={{
          flexWrap: "wrap",
          gap: 16,
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius)",
        }}
      >
        {summary.map((item, index) => (
          <div key={item.label} className="row" style={{ gap: 8 }}>
            {index > 0 && (
              <span
                aria-hidden
                style={{
                  width: 1,
                  height: 16,
                  background: "var(--border)",
                  marginRight: 8,
                }}
              />
            )}
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              {item.label}:
            </span>
            <span
              style={{
                ...MONO,
                fontWeight: 700,
                color:
                  item.tone === "green"
                    ? "var(--green-600)"
                    : item.tone === "red"
                      ? "var(--red-600)"
                      : "var(--ink)",
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div
        className="row"
        style={{
          flexWrap: "wrap",
          gap: 16,
          padding: 16,
          background: "var(--surface)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius)",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
          <input
            className="input"
            type="search"
            placeholder="Search by borrower or book title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 160 }}
        />
        <Button
          variant="ghost"
          onClick={clearFilters}
          disabled={!search && statusFilter === "All Statuses"}
        >
          Clear Filters
        </Button>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={paginatedRecords}
          rowKey="id"
          emptyMessage="No borrow records match your filters."
          onRowClick={setSelectedRecord}
        />
        <div className="row row--between" style={{ paddingTop: 14 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {filteredRecords.length === 0
              ? "No records to display"
              : `Showing ${rangeStart} to ${rangeEnd} of ${filteredRecords.length} records`}
          </span>
          <div className="row row--between" style={{ gap: 12 }}>
            <span style={{ ...MONO, fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <div className="pager" style={{ paddingTop: 0 }}>
              <button
                type="button"
                className="pager__btn"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="pager__btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {selectedRecord && (
        <Modal
          title={`Borrow Record ${selectedRecord.id}`}
          onClose={() => setSelectedRecord(null)}
          footer={
            <>
              {selectedRecord.status !== BORROW_STATUS.RETURNED && (
                <Button variant="gold" onClick={() => handleMarkReturned(selectedRecord)}>
                  Mark as Returned
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
            </>
          }
        >
          <div className="stack" style={{ gap: 12 }}>
            <div>
              <p className="field__label">Borrower</p>
              <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{selectedRecord.borrower}</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                {selectedRecord.borrowerDetail}
              </p>
            </div>
            <div>
              <p className="field__label">Book</p>
              <p style={{ margin: "4px 0 0" }}>{selectedRecord.book}</p>
              <p style={{ margin: 0, ...MONO, fontSize: 12, color: "var(--muted)" }}>
                ISBN: {selectedRecord.isbn}
              </p>
            </div>
            <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <p className="field__label">Borrowed On</p>
                <p style={{ margin: "4px 0 0", ...MONO }}>{selectedRecord.borrowedOn}</p>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <p className="field__label">Due Date</p>
                <p style={{ margin: "4px 0 0", ...MONO }}>{selectedRecord.dueDate}</p>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <p className="field__label">Returned On</p>
                <p style={{ margin: "4px 0 0", ...MONO, color: "var(--muted)" }}>
                  {selectedRecord.returnedOn ?? "—"}
                </p>
              </div>
            </div>
            <div>
              <p className="field__label">Status</p>
              <div style={{ marginTop: 6 }}>
                <StatusBadge status={selectedRecord.status} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
