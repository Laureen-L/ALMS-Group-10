// Student — My Borrowings. Active loans with a Return action.
// MOCK data; wire to borrowService.getActive() later.
import { Bookmark, Bell, AlertCircle } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";

const ACTIVE = [
  { id: 1, title: "Quantum Physics", author: "L.D. Landau", borrowed: "Oct 12, 2023", due: "Oct 26, 2023", status: "active" },
  { id: 2, title: "Artificial Intelligence", author: "Stuart Russell", borrowed: "Oct 14, 2023", due: "Oct 21, 2023", status: "due_soon" },
  { id: 3, title: "Solid State Chemistry", author: "Lesley Smart", borrowed: "Oct 05, 2023", due: "Oct 19, 2023", status: "active" },
];

export default function MyBorrowingsPage() {
  function onReturn(row) {
    // TODO: borrowService.returnBook(row.id)
    console.log("return", row.id);
  }

  return (
    <div>
      <h1 className="page-title">My Borrowings</h1>
      <p className="page-sub">Books you currently have on loan.</p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="active"   icon={Bookmark}   eyebrow="Active"   value="3" label="Books Borrowed" />
        <StatCard tone="warning"  icon={Bell}       eyebrow="Warning"  value="1" label="Due Soon" />
        <StatCard tone="critical" icon={AlertCircle} eyebrow="Critical" value="0" label="Overdue" />
        <StatCard tone="neutral"  icon={Bookmark}   eyebrow="Limit"    value="5" label="Books Allowed" />
      </div>

      <Card title="Active Loans">
        <DataTable
          columns={[
            { key: "title", header: "Book Title" },
            { key: "author", header: "Author" },
            { key: "borrowed", header: "Borrow Date" },
            { key: "due", header: "Due Date" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "action", header: "Action", render: (r) => <button className="link-btn" onClick={() => onReturn(r)}>Return</button> },
          ]}
          rows={ACTIVE}
          emptyMessage="You have no active borrowings."
        />
      </Card>
    </div>
  );
}