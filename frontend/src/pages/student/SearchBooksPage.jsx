// Student — Search Books. Filter bar + results grid of catalog cards.
// MOCK results for now; wire to bookService.search later.
import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Search } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";

const RESULTS = [
  { id: 1, title: "Principles of Structural Engineering", author: "Dr. Samuel Boateng", isbn: "978-01345", available: true },
  { id: 2, title: "Advanced Calculus for Engineers", author: "Prof. Elena Vance", isbn: "978-05211", available: false },
  { id: 3, title: "Digital Signal Processing", author: "Alan V. Oppenheim", isbn: "978-01319", available: true },
  { id: 4, title: "Mechanics of Materials", author: "Ferdinand P. Beer", isbn: "978-07721", available: true },
  { id: 5, title: "Modern Steel Design", author: "William T. Segui", isbn: "978-03390", available: true },
  { id: 6, title: "Organic Chemistry Vol II", author: "Clayden et al.", isbn: "978-09912", available: false },
];

export default function SearchBooksPage() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [availability, setAvailability] = useState("");

  function onSearch() {
    // TODO: bookService.search({ query, genre, availability })
    console.log("search", { query, genre, availability });
  }

  return (
    <div>
      <h1 className="page-title">Search Books</h1>
      <p className="page-sub">Find and borrow from the library catalog.</p>

      <Card>
        <div className="row" style={{ gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "2 1 220px" }}>
            <Input label="Search library" placeholder="Search by title, author, ISBN…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <Select label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}
              options={[{ value: "", label: "All Genres" }, "Engineering", "Science", "Arts & Humanities", "Business"]} />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <Select label="Availability" value={availability} onChange={(e) => setAvailability(e.target.value)}
              options={[{ value: "", label: "All Books" }, { value: "available", label: "Available" }, { value: "borrowed", label: "Borrowed" }]} />
          </div>
          <Button variant="gold" onClick={onSearch}><Search size={16} /> Search</Button>
        </div>
      </Card>

      <p className="page-sub" style={{ margin: "22px 0 14px" }}>{RESULTS.length} results</p>
      <div className="book-grid">
        {RESULTS.map((b) => (
          <div key={b.id} className={`book-card ${b.available ? "" : "book-card--borrowed"}`}>
            <div className="book-card__cover"><BookOpen size={22} /></div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <StatusBadge status={b.available ? "available" : "borrowed"} />
              <Link to={`/student/catalog/${b.id}`} className="book-card__title" style={{ marginTop: 8 }}>{b.title}</Link>
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
    </div>
  );
}