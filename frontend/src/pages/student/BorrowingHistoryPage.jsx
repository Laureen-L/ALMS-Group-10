// Student — Borrowing History. Past (returned/late) loans, with pagination.
// MOCK data; wire to borrowService.getHistory() later.
import { useState } from "react";
import Card from "../../components/ui/Card.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import Pagination from "../../components/tables/Pagination.jsx";

const HISTORY = [
  { id: 1, title: "Mechanical Vibrations", author: "Singiresu Rao", borrowed: "Sept 01, 2023", returned: "Sept 15, 2023", status: "returned" },
  { id: 2, title: "Macroeconomics", author: "N. Gregory Mankiw", borrowed: "Aug 08, 2023", returned: "Aug 22, 2023", status: "late" },
  { id: 3, title: "Data Structures 101", author: "Abena Fosua", borrowed: "Jul 20, 2023", returned: "Aug 02, 2023", status: "returned" },
  { id: 4, title: "Linear Algebra", author: "Gilbert Strang", borrowed: "Jul 01, 2023", returned: "Jul 14, 2023", status: "returned" },
  { id: 5, title: "Thermodynamics", author: "Yunus Çengel", borrowed: "Jun 10, 2023", returned: "Jun 28, 2023", status: "late" },
];

const PER_PAGE = 4;

export default function BorrowingHistoryPage() {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(HISTORY.length / PER_PAGE);
  const rows = HISTORY.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <h1 className="page-title">Borrowing History</h1>
      <p className="page-sub">Every book you’ve borrowed and returned.</p>

      <Card title="Past Borrowings">
        <DataTable
          columns={[
            { key: "title", header: "Book Title" },
            { key: "author", header: "Author" },
            { key: "borrowed", header: "Borrow Date" },
            { key: "returned", header: "Return Date" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={rows}
          emptyMessage="No history yet."
        />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}