// Student — Browse Books. Two-step: pick a genre, then search inside it.
// Landing on the page with ?search= (from the topbar) skips straight to
// results across every genre.
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { getBooks, getGenres } from "../../services/bookService.js";
import { useDebounce } from "../../hooks/useDebounce.js";

// Soft tint per genre so the browse grid reads as a set of shelves.
// Unlisted genres fall back to the neutral cream tile.
const GENRE_TINT = {
  "Fiction": "var(--gold-100)",
  "Computer Science": "var(--green-100)",
  "Software Engineering": "var(--green-100)",
  "History": "var(--amber-100)",
  "Mathematics": "var(--green-100)",
  "Biology": "var(--green-100)",
  "Chemistry": "var(--amber-100)",
  "Physics": "var(--gold-100)",
  "Economics": "var(--gold-100)",
  "Self-Help": "var(--green-100)",
};

export default function SearchBooksPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [search, setSearch] = useState(params.get("search") || "");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  // A ?search= in the URL means "search everything", so skip the genre grid.
  const searchingAll = !selectedGenre && !!params.get("search");
  const showResults = !!selectedGenre || searchingAll;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGenresLoading(true);
      try {
        const g = await getGenres();
        if (!cancelled) setGenres(g);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setGenresLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // The topbar searches as you type and rewrites ?search=, so mirror the URL
  // into the field instead of only reading it once on mount. A topbar search
  // also drops the current shelf — it's meant to reach the whole catalog, and
  // staying inside one genre would silently hide most of the matches.
  useEffect(() => {
    const incoming = params.get("search");
    if (incoming === null) return;
    setSearch(incoming);
    if (incoming) setSelectedGenre(null);
  }, [params]);

  useEffect(() => {
    if (!showResults) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await getBooks({ search: debouncedSearch, genre: selectedGenre || "" });
        if (!cancelled) setBooks(results);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedGenre, debouncedSearch, showResults]);

  function backToGenres() {
    setSelectedGenre(null);
    setSearch("");
    setBooks([]);
    setParams({}, { replace: true });
  }

  // --- Step 1: the genre grid ---
  if (!showResults) {
    return (
      <div>
        <h1 className="page-title">Browse by Genre</h1>
        <p className="page-sub">Pick a shelf to see what's on it.</p>

        {genresLoading && <div className="state"><div className="state__spinner" />Loading genres…</div>}
        {error && !genresLoading && <div className="state">Couldn’t load genres. {error.message}</div>}

        {!genresLoading && !error && (
          genres.length === 0 ? (
            <div className="state">No genres in the catalog yet.</div>
          ) : (
            <div className="genre-grid">
              {genres.map(({ genre, count }) => (
                <button
                  key={genre}
                  type="button"
                  className="genre-card"
                  style={{ background: GENRE_TINT[genre] || "var(--cream-dark)" }}
                  onClick={() => setSelectedGenre(genre)}
                >
                  <h2 className="genre-card__name">{genre}</h2>
                  <p className="genre-card__count">{count} {count === 1 ? "book" : "books"}</p>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    );
  }

  // --- Step 2: books within the genre (or across all, when searching) ---
  return (
    <div>
      <button className="link-btn" onClick={backToGenres} style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={16} /> Back to Genres
      </button>

      <h1 className="page-title">{selectedGenre || "Search Results"}</h1>
      <p className="page-sub">
        {selectedGenre ? `Books shelved under ${selectedGenre}.` : "Matches across every genre."}
      </p>

      <Card>
        <Input
          label="Search this shelf"
          placeholder="Search by title or author…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {loading && <div className="state"><div className="state__spinner" />Loading books…</div>}
      {error && <div className="state">Couldn’t load books. {error.message}</div>}

      {!loading && !error && (
        <>
          <p className="page-sub" style={{ margin: "22px 0 14px" }}>
            {books.length} {books.length === 1 ? "result" : "results"}
          </p>

          {books.length === 0 ? (
            <div className="state">
              <Search size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
              No books found in {selectedGenre || "the catalog"} matching your search.
            </div>
          ) : (
            <div className="book-grid">
              {books.map((b) => (
                <div
                  key={b.id}
                  className="book-card"
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/student/catalog/${b.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/student/catalog/${b.id}`); }}
                >
                  <div className="book-card__cover"><Search size={22} /></div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <Badge tone="green">{b.genre || "Book"}</Badge>
                    <span className="book-card__title" style={{ marginTop: 8 }}>{b.title}</span>
                    <div className="book-card__author">By {b.author}</div>
                    <div style={{ marginTop: "auto", fontSize: 13, fontWeight: 600 }}>
                      {b.availableQuantity > 0 ? (
                        <span style={{ color: "var(--green-700)" }}>{b.availableQuantity} available</span>
                      ) : (
                        <span style={{ color: "var(--red-600)" }}>Not available</span>
                      )}
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
