// SCREEN 5 — Librarian Dashboard.
// Stat cards, overdue alert banner, tabs (Catalog / Activity / Overdue),
// book catalog table with Edit/Remove (Remove opens a confirm modal).
// MOCK data; wire to bookService / borrowService later.
import { useState } from "react";
import { BookOpen, Users, ClipboardCheck, AlertTriangle, Plus, Pencil, Trash2, Send } from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Card from "../../components/ui/Card.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";

const BOOKS = [
  { id: "BK-4521", title: "Advanced Algorithms", author: "Dr. Kofi Adu", isbn: "978-0131103627", genre: "CS", qty: 15, status: "available" },
  { id: "BK-3910", title: "Modern Civil Structures", author: "Elena Mensah", isbn: "978-3161484100", genre: "Engineering", qty: 2, status: "low_stock" },
  { id: "BK-1102", title: "Microeconomics 101", author: "Samuel Osei", isbn: "978-0061120084", genre: "Business", qty: 0, status: "out_of_stock" },
];

const ACTIVITY = [
  { id: 1, member: "Ama Serwaa", title: "Modern Algorithms in Java", action: "Borrow", date: "Oct 12, 2023", status: "active" },
  { id: 2, member: "Kwame Mensah", title: "Intro to Quantum Computing", action: "Borrow", date: "Sep 20, 2023", status: "overdue" },
  { id: 3, member: "Abena Fosua", title: "Data Structures 101", action: "Return", date: "Sep 01, 2023", status: "returned" },
];

const OVERDUE = [
  { id: 1, member: "Kwame Mensah", title: "Intro to Quantum Computing", due: "Oct 20, 2023", daysLate: 8 },
  { id: 2, member: "Yaw Boateng", title: "Organic Chemistry Vol II", due: "Oct 18, 2023", daysLate: 10 },
];

export default function LibrarianDashboardPage() {
  const [tab, setTab] = useState("catalog");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [status, setStatus] = useState("");
  const [removing, setRemoving] = useState(null); // book pending removal

  function confirmRemove() {
    // TODO: bookService.remove(removing.id)
    console.log("removed", removing.id);
    setRemoving(null);
  }

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Manage the catalog, loans, and overdue books.</p>

      {/* Stat cards */}
      <div className="grid-stats">
        <StatCard tone="neutral"  icon={BookOpen}        eyebrow="+12 new"  value="1,247" label="Total Books" />
        <StatCard tone="active"   icon={Users}           eyebrow="+4 today" value="856"   label="Total Members" />
        <StatCard tone="active"   icon={ClipboardCheck}  eyebrow="Active"   value="142"   label="Active Loans" />
        <StatCard tone="critical" icon={AlertTriangle}   eyebrow="Action"   value="23"    label="Overdue Loans" />
      </div>

      {/* Overdue banner */}
      <div style={{ margin: "22px 0" }}>
        <AlertBanner
          tone="danger"
          message="You have 23 overdue loans that require immediate action."
          action={<Button variant="outline" style={{ background: "#fff" }}>Send All Reminders</Button>}
        />
      </div>

      {/* Tabs */}
      <Card>
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "catalog", label: "Book Catalog" },
            { id: "activity", label: "Borrowing Activity" },
            { id: "overdue", label: "Overdue Management" },
          ]}
        />

        <div style={{ marginTop: 18 }}>
          {tab === "catalog" && (
            <>
              <div className="toolbar">
                <div className="toolbar__search">
                  <Input placeholder="Search by title, author, or ISBN…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div className="toolbar__filter">
                  <Select value={genre} onChange={(e) => setGenre(e.target.value)}
                    options={[{ value: "", label: "All Genres" }, "CS", "Engineering", "Business", "Science"]} />
                </div>
                <div className="toolbar__filter">
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}
                    options={[{ value: "", label: "All Statuses" }, { value: "available", label: "Available" }, { value: "low_stock", label: "Low Stock" }, { value: "out_of_stock", label: "Out of Stock" }]} />
                </div>
                <Button variant="green"><Plus size={16} /> Add New Book</Button>
              </div>

              <DataTable
                rowKey="id"
                columns={[
                  { key: "id", header: "ID" },
                  { key: "title", header: "Title" },
                  { key: "author", header: "Author" },
                  { key: "isbn", header: "ISBN" },
                  { key: "genre", header: "Genre" },
                  { key: "qty", header: "Qty" },
                  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
                  { key: "actions", header: "Actions", render: (r) => (
                    <span className="actions-cell">
                      <button className="act-edit"><Pencil size={14} /> Edit</button>
                      <button className="act-remove" onClick={() => setRemoving(r)}><Trash2 size={14} /> Remove</button>
                    </span>
                  ) },
                ]}
                rows={BOOKS}
                emptyMessage="No books match your filters."
              />
            </>
          )}

          {tab === "activity" && (
            <DataTable
              columns={[
                { key: "member", header: "Member" },
                { key: "title", header: "Book Title" },
                { key: "action", header: "Action" },
                { key: "date", header: "Date" },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={ACTIVITY}
              emptyMessage="No borrowing activity yet."
            />
          )}

          {tab === "overdue" && (
            <DataTable
              columns={[
                { key: "member", header: "Member" },
                { key: "title", header: "Book Title" },
                { key: "due", header: "Due Date" },
                { key: "daysLate", header: "Days Late", render: () => <StatusBadge status="overdue" /> },
                { key: "actions", header: "Action", render: () => (
                  <button className="act-edit"><Send size={14} /> Send reminder</button>
                ) },
              ]}
              rows={OVERDUE}
              emptyMessage="Nothing overdue — nice."
            />
          )}
        </div>
      </Card>

      {/* Remove confirmation */}
      {removing && (
        <Modal
          title="Remove this book?"
          onClose={() => setRemoving(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmRemove}>Remove book</Button>
            </>
          }
        >
          <p>You’re about to remove <strong>{removing.title}</strong> ({removing.id}) from the catalog. This can’t be undone.</p>
        </Modal>
      )}
    </div>
  );
}