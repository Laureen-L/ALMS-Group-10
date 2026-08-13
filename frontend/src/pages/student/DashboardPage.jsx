// SCREEN 1 — Student Dashboard. Summary + search hand-off + popular picks +
// favorites + current loans and history.
// The standalone catalog grid was removed — browsing lives on Search Books.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Bell, AlertCircle, Search } from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import BorrowLimit from "../../components/books/BorrowLimit.jsx";
import BookTile from "../../components/books/BookTile.jsx";
import { getStudentDashboard } from "../../services/borrowService.js";
import { getPopularBooks, getBooks } from "../../services/bookService.js";
import { getFavorites } from "../../services/userService.js";
import { useDebounce } from "../../hooks/useDebounce.js";
import { useAuth } from "../../context/AuthContext.jsx";

// How many matches to show inline before pointing at the full results page.
const SUGGEST_LIMIT = 6;

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ active: [], overdue: [], history: [], summary: {} });
  const [popularBooks, setPopularBooks] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedQuery = useDebounce(searchQuery, 250);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      setLoading(true); setError(null);
      try {
        // Popular picks and favorites are decoration — a failure there must not
        // blank the loans table, so they settle independently.
        const [dash, popular, favs] = await Promise.all([
          getStudentDashboard(user.id),
          getPopularBooks().catch(() => []),
          getFavorites(user.id).catch(() => []),
        ]);
        if (cancelled) return;
        setData(dash);
        setPopularBooks(popular);
        setFavorites(favs);
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Matching books surface right under the field as the query is typed —
  // no need to submit first just to find out whether the library has it.
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) { setMatches([]); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    getBooks({ search: q })
      .then((r) => { if (!cancelled) setMatches(r); })
      .catch(() => { if (!cancelled) setMatches([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const openBook = (book) => navigate(`/student/catalog/${book.id}`);

  function handleSearch(e) {
    e.preventDefault();
    navigate(`/student/search?search=${encodeURIComponent(searchQuery.trim())}`);
  }

  const s = data.summary || {};
  const activeLoans = (data.active?.length || 0) + (data.overdue?.length || 0);

  return (
    <div>
      <p className="dash-intro">Welcome back{user?.name ? `, ${user.name}` : ""}.</p>

      <div className="grid-stats">
        <StatCard tone="active"   icon={Bookmark}    eyebrow="Active"   value={String(s.totalActive ?? 0)}   label="Books Borrowed" />
        <StatCard tone="warning"  icon={Bell}        eyebrow="Total"    value={String(s.totalBorrowed ?? 0)} label="Total Borrowed" />
        <StatCard tone="critical" icon={AlertCircle} eyebrow="Overdue"  value={String(s.totalOverdue ?? 0)}  label="Overdue Books" />
        <BorrowLimit activeLoans={activeLoans} />
      </div>

      <div style={{ marginTop: 26 }}>
        <Card title="Find a book">
          <form className="row" style={{ gap: 12, alignItems: "flex-end" }} onSubmit={handleSearch}>
            <div style={{ flex: "1 1 260px" }}>
              <Input
                label="Search the library"
                placeholder="Search by title or author…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" variant="gold"><Search size={16} /> Search</Button>
          </form>

          {searchQuery.trim() && (
            <div className="suggest">
              {searching && matches.length === 0 && (
                <div className="suggest__empty">Searching…</div>
              )}
              {!searching && matches.length === 0 && (
                <div className="suggest__empty">No books match “{searchQuery.trim()}”.</div>
              )}
              {matches.slice(0, SUGGEST_LIMIT).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="suggest__row"
                  onClick={() => openBook(b)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="suggest__title">{b.title}</div>
                    <div className="suggest__meta">{b.author}{b.genre ? ` · ${b.genre}` : ""}</div>
                  </div>
                  <span
                    className="suggest__side"
                    style={{ color: b.availableQuantity > 0 ? "var(--green-700)" : "var(--red-600)" }}
                  >
                    {b.availableQuantity > 0 ? `${b.availableQuantity} available` : "Not available"}
                  </span>
                </button>
              ))}
              {matches.length > SUGGEST_LIMIT && (
                <button type="button" className="link-btn" style={{ marginTop: 8, marginLeft: 12 }} onClick={handleSearch}>
                  See all {matches.length} results
                </button>
              )}
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 26 }}>
        <Card title="Popular Picks">
          {popularBooks.length === 0 ? (
            <div className="state">Nothing borrowed yet — popular titles will appear here.</div>
          ) : (
            <div className="book-grid">
              {popularBooks.map((b) => (
                <BookTile
                  key={b.id}
                  book={b}
                  onOpen={openBook}
                  footer={<span style={{ color: "var(--muted)" }}>{b.borrowCount} borrows</span>}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 22 }}>
        <Card title="My Favorites">
          {favorites.length === 0 ? (
            <div className="state">No favorites yet — browse books and tap ☆ to save them.</div>
          ) : (
            <div className="book-grid">
              {favorites.map((b) => (
                <BookTile
                  key={b.id}
                  book={b}
                  onOpen={openBook}
                  footer={
                    b.availableQuantity > 0
                      ? <span style={{ color: "var(--green-700)", fontWeight: 600 }}>{b.availableQuantity} available</span>
                      : <span style={{ color: "var(--red-600)", fontWeight: 600 }}>Not available</span>
                  }
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 22 }}>
        <Card title="Current Borrowings">
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "title", header: "Book Title" },
              { key: "author", header: "Author" },
              { key: "borrowed", header: "Borrow Date" },
              { key: "due", header: "Due Date" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.active}
            emptyMessage="No active borrowings."
          />
        </Card>
      </div>

      <div style={{ marginTop: 22 }}>
        <Card title="Borrowing History">
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "title", header: "Book Title" },
              { key: "author", header: "Author" },
              { key: "borrowed", header: "Borrow Date" },
              { key: "returned", header: "Return Date" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.history}
            emptyMessage="No history yet."
          />
        </Card>
      </div>
    </div>
  );
}