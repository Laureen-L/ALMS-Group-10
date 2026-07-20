// SCREEN 2 — Book Detail. Fetches the real book, shows similar books, and the
// Borrow button now actually borrows (POST /borrow) with feedback.
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BookOpen, Bookmark, Heart, CheckCircle2 } from "lucide-react";
import Breadcrumb from "../../components/ui/Breadcrumb.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import { getBook, getBooks } from "../../services/bookService.js";
import { borrow } from "../../services/borrowService.js";

export default function BookDetailPage() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [borrowing, setBorrowing] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "ok"|"err", text }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const b = await getBook(bookId);
        if (cancelled) return;
        setBook(b);
        const more = await getBooks({ genre: b.genre || "" });
        if (!cancelled) setSimilar(more.filter((x) => x.id !== b.id).slice(0, 3));
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [bookId]);

  if (loading) return <div className="state"><div className="state__spinner" />Loading book…</div>;
  if (error) return <div className="state">Couldn’t load this book. {error.message}</div>;
  if (!book) return <div className="state">Book not found.</div>;

  async function onBorrow() {
    setBorrowing(true);
    setNotice(null);
    try {
      await borrow(book.id);
      setNotice({ type: "ok", text: "Book borrowed. Check My Borrowings for the due date." });
    } catch (e) {
      setNotice({ type: "err", text: e.message || "Couldn’t borrow this book." });
    } finally {
      setBorrowing(false);
    }
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: "Home", to: "/student/dashboard" },
        { label: "Catalog", to: "/student/search" },
        { label: book.title },
      ]} />

      <div className="detail-grid" style={{ marginTop: 18 }}>
        <div>
          <div className="detail-cover"><span>{(book.title || "").toUpperCase()}</span></div>
          <div className="stack" style={{ gap: 10, marginTop: 14 }}>
            <Button variant="green" block onClick={onBorrow} disabled={borrowing}>
              <Bookmark size={16} /> {borrowing ? "Borrowing…" : "Borrow Book"}
            </Button>
            <Button variant="outline" block><Heart size={16} /> Add to Favorites</Button>
          </div>
          {notice && (
            <div className="auth__notice" style={{ marginTop: 12, background: notice.type === "ok" ? "var(--green-100)" : "var(--red-100)", color: notice.type === "ok" ? "var(--green-900)" : "var(--red-600)" }}>
              <CheckCircle2 size={18} /><span>{notice.text}</span>
            </div>
          )}
        </div>

        <div>
          <Badge tone="green">{book.genre || "Book"}</Badge>
          <h1 className="detail-title">{book.title}</h1>
          <p className="detail-authors">{book.author}</p>

          <dl className="meta-grid">
            <div><dt>Genre</dt><dd>{book.genre || "—"}</dd></div>
            <div><dt>Published</dt><dd>{book.publishedYear || "—"}</dd></div>
            {book.isbn && <div><dt>ISBN</dt><dd>{book.isbn}</dd></div>}
            <div><dt>Availability</dt><dd>{book.available ? "Available" : "On loan"}</dd></div>
          </dl>
        </div>
      </div>

      {similar.length > 0 && (
        <>
          <h2 className="page-title" style={{ margin: "28px 0 6px" }}>Similar Books</h2>
          <p className="page-sub">More from {book.genre}</p>
          <div className="book-grid">
            {similar.map((b) => (
              <div key={b.id} className="book-card">
                <div className="book-card__cover"><BookOpen size={22} /></div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <Badge tone="green">{b.genre || "Book"}</Badge>
                  <Link to={`/student/catalog/${b.id}`} className="book-card__title" style={{ marginTop: 8 }}>{b.title}</Link>
                  <div className="book-card__author">By {b.author}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}