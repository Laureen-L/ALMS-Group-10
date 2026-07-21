// Student — Search Books. Now fetches from the real backend (GET /books).
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Search } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { getBooks } from "../../services/bookService.js";

export default function SearchBooksPage() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setBooks(await getBooks({ search: query, genre }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // initial load

  return (
    <div>
      <h1 className="page-title">Search Books</h1>
      <p className="page-sub">Find and borrow from the library catalog.</p>

      <Card>
        <div className="row" style={{ gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "2 1 220px" }}>
            <Input label="Search library" placeholder="Search by title…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <Select label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}
              options={[{ value: "", label: "All Genres" }, "Technology", "Science", "Business", "Engineering"]} />
          </div>
          <Button variant="gold" onClick={load}><Search size={16} /> Search</Button>
        </div>
      </Card>

      {loading && <div className="state"><div className="state__spinner" />Loading books…</div>}
      {error && <div className="state">Couldn’t load books. {error.message}</div>}

      {!loading && !error && (
        <>
          <p className="page-sub" style={{ margin: "22px 0 14px" }}>{books.length} results</p>
          {books.length === 0 ? (
            <div className="state">No books found.</div>
          ) : (
            <div className="book-grid">
              {books.map((b) => (
                <div key={b.id} className="book-card">
                  <div className="book-card__cover"><BookOpen size={22} /></div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <Badge tone="green">{b.genre || "Book"}</Badge>
                    <Link to={`/student/catalog/${b.id}`} className="book-card__title" style={{ marginTop: 8 }}>{b.title}</Link>
                    <div className="book-card__author">By {b.author}</div>
                    {b.publishedYear && <div className="book-card__isbn">Published {b.publishedYear}</div>}
                    <div style={{ marginTop: "auto" }}>
                      <Link to={`/student/catalog/${b.id}`}><Button variant="gold" size="sm">View</Button></Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}