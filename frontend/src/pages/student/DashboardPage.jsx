// SCREEN 1 — Student Dashboard.
// Stat cards, search/filter bar, catalog cards, current borrowings + history tables.
// Uses MOCK data for now — swap the arrays for service calls when the backend is ready.
import { useState } from "react";
import { BookOpen, Bookmark, Bell, AlertCircle, Search } from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";

// ----- MOCK DATA (replace with bookService / borrowService later) -----
const CATALOG = [
  { id: 1, title: "Principles of Structural Engineering", author: "Dr. Samuel Boateng", isbn: "978-01345", available: true },
  { id: 2, title: "Advanced Calculus for Engineers", author: "Prof. Elena Vance", isbn: "978-05211", available: false },
  { id: 3, title: "Digital Signal Processing", author: "Alan V. Oppenheim", isbn: "978-01319", available: true },
];

const CURRENT = [
  { id: 1, title: "Quantum Physics", author: "L.D. Landau", borrowed: "Oct 12, 2023", due: "Oct 26, 2023", status: "active" },
  { id: 2, title: "Artificial Intelligence", author: "Stuart Russell", borrowed: "Oct 14, 2023", due: "Oct 21, 2023", status: "due_soon" },
  { id: 3, title: "Solid State Chemistry", author: "Lesley Smart", borrowed: "Oct 05, 2023", due: "Oct 19, 2023", status: "active" },
];

const HISTORY = [
  { id: 1, title: "Mechanical Vibrations", author: "Singiresu Rao", borrowed: "Sept 01, 2023", returned: "Sept 15, 2023", status: "returned" },
  { id: 2, title: "Macroeconomics", author: "N. Gregory Mankiw", borrowed: "Aug 08, 2023", returned: "Aug 22, 2023", status: "late" },
];

export default function StudentDashboardPage() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [availability, setAvailability] = useState("");

  function onSearch() {
    // TODO: call bookService.search({ query, genre, availability })
    console.log("search", { query, genre, availability });
  }

  return (
    <div>
      <p className="dash-intro">You have borrowed <strong>3 of 5</strong> books allowed.</p>

      {/* Stat cards */}
      <div className="grid-stats">
        <StatCard tone="neutral"  icon={BookOpen}   eyebrow="Inventory" value="1,247" label="Books Available" />
        <StatCard tone="active"   icon={Bookmark}   eyebrow="Active"    value="3"     label="Books Borrowed" />
        <StatCard tone="warning"  icon={Bell}       eyebrow="Warning"   value="1"     label="Due Soon" />
        <StatCard tone="critical" icon={AlertCircle} eyebrow="Critical" value="0"     label="Overdue Books" />
      </div>

      {/* Search / filter */}
      <Card>
        <div className="row" style={{ gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "2 1 220px" }}>
            <Input label="Search library" placeholder="Search by title, author…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <Select label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}
              options={[{ value: "", label: "All Genres" }, "Engineering", "Science", "Arts & Humanities"]} />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <Select label="Availability" value={availability} onChange={(e) => setAvailability(e.target.value)}
              options={[{ value: "", label: "All Books" }, { value: "available", label: "Available" }, { value: "borrowed", label: "Borrowed" }]} />
          </div>
          <Button variant="gold" onClick={onSearch}><Search size={16} /> Search</Button>
        </div>
      </Card>

      {/* Catalog */}
      <h2 className="page-title" style={{ margin: "26px 0 14px" }}>Library Catalog</h2>
      <div className="book-grid">
        {CATALOG.map((b) => (
          <div key={b.id} className={`book-card ${b.available ? "" : "book-card--borrowed"}`}>
            <div className="book-card__cover"><BookOpen size={22} /></div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <StatusBadge status={b.available ? "available" : "borrowed"} />
              <div className="book-card__title" style={{ marginTop: 8 }}>{b.title}</div>
              <div className="book-card__author">By {b.author}</div>
              <div className="book-card__isbn">ISBN: {b.isbn}</div>
              <div style={{ marginTop: "auto" }}>
                {b.available
                  ? <Button variant="gold" size="sm">Borrow Book</Button>
                  : <Button variant="ghost" size="sm" disabled>Unavailable</Button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Current borrowings */}
      <div style={{ marginTop: 26 }}>
        <Card title="Current Borrowings">
          <DataTable
            columns={[
              { key: "title", header: "Book Title" },
              { key: "author", header: "Author" },
              { key: "borrowed", header: "Borrow Date" },
              { key: "due", header: "Due Date" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "action", header: "Action", render: () => <button className="link-btn">Return</button> },
            ]}
            rows={CURRENT}
            emptyMessage="You have no active borrowings."
          />
        </Card>
      </div>

      {/* History */}
      <div style={{ marginTop: 22 }}>
        <Card title="Borrowing History">
          <DataTable
            columns={[
              { key: "title", header: "Book Title" },
              { key: "author", header: "Author" },
              { key: "borrowed", header: "Borrow Date" },
              { key: "returned", header: "Return Date" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={HISTORY}
            emptyMessage="No history yet."
          />
        </Card>
      </div>
    </div>
  );
}