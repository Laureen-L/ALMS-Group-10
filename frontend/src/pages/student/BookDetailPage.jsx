// SCREEN 2 — Book Detail. Fetches the real book, shows similar books, and the
// Borrow button now actually borrows (POST /borrow) with feedback.
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BookOpen, Bookmark, Heart, CheckCircle2 } from "lucide-react";
import Breadcrumb from "../../components/ui/Breadcrumb.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import { getBook, getBooks } from "../../services/bookService.js";
import { borrow, getStudentDashboard } from "../../services/borrowService.js";
import { getFavorites, addFavorite, removeFavorite } from "../../services/userService.js";
import { BORROW_LIMIT } from "../../components/books/BorrowLimit.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function BookDetailPage() {
  const { bookId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [book, setBook] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [activeLoans, setActiveLoans] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
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

  // How many books this member already has out — drives the borrow button.
  useEffect(() => {
    let cancelled = false;
    async function loadLoans() {
      if (!user?.id) return;
      try {
        const dash = await getStudentDashboard(user.id);
        if (!cancelled) setActiveLoans((dash.active?.length || 0) + (dash.overdue?.length || 0));
      } catch { /* the button just stays enabled; the API still enforces the limit */ }
    }
    loadLoans();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Is this book already on the member's favorites list?
  useEffect(() => {
    let cancelled = false;
    async function loadFavorite() {
      if (!user?.id || !bookId) return;
      try {
        const favs = await getFavorites(user.id);
        if (!cancelled) setIsFavorited(favs.some((f) => String(f.id) === String(bookId)));
      } catch { /* leave the star unset; toggling still works */ }
    }
    loadFavorite();
    return () => { cancelled = true; };
  }, [user?.id, bookId]);

  async function toggleFavorite() {
    if (!book || togglingFav) return;
    const next = !isFavorited;
    setTogglingFav(true);
    setIsFavorited(next); // optimistic — revert below if the call fails
    try {
      if (next) await addFavorite(user.id, book);
      else await removeFavorite(user.id, book);
      toast.success(next ? "Added to your favorites." : "Removed from your favorites.");
    } catch (e) {
      setIsFavorited(!next);
      toast.error(e.message || "Couldn’t update your favorites.");
    } finally {
      setTogglingFav(false);
    }
  }

  if (loading) return <div className="state"><div className="state__spinner" />Loading book…</div>;
  if (error) return <div className="state">Couldn’t load this book. {error.message}</div>;
  if (!book) return <div className="state">Book not found.</div>;

  async function onBorrow() {
    setBorrowing(true);
    setNotice(null);
    try {
      await borrow(book.id);
      setActiveLoans((n) => n + 1);
      setBook((b) => ({ ...b, availableQuantity: Math.max(0, (b.availableQuantity ?? 1) - 1) }));
      setNotice({ type: "ok", text: "Book borrowed. Check My Borrowings for the due date." });
      toast.success(`Borrowed “${book.title}”.`);
    } catch (e) {
      setNotice({ type: "err", text: e.message || "Couldn’t borrow this book." });
      toast.error(e.message || "Couldn’t borrow this book.");
    } finally {
      setBorrowing(false);
    }
  }

  const atLimit = activeLoans >= BORROW_LIMIT;
  const outOfStock = (book.availableQuantity ?? 0) <= 0;

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
            <Button variant="green" block onClick={onBorrow} disabled={borrowing || atLimit || outOfStock}>
              <Bookmark size={16} />
              {borrowing ? "Borrowing…"
                : atLimit ? "Borrow Limit Reached"
                : outOfStock ? "Not Available"
                : "Borrow Book"}
            </Button>
            {atLimit && (
              <p className="borrow-limit__warn">
                ⚠ You have {activeLoans} of {BORROW_LIMIT} books out — return one before borrowing another.
              </p>
            )}
            <Button
              variant="outline"
              block
              className={isFavorited ? "fav-btn--on" : undefined}
              onClick={toggleFavorite}
              disabled={togglingFav}
              aria-pressed={isFavorited}
            >
              <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
              {isFavorited ? "★ Favorited" : "☆ Add to Favorites"}
            </Button>
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
            {book.isbn && <div><dt>ISBN</dt><dd>{book.isbn}</dd></div>}
            <div>
              <dt>Availability</dt>
              <dd style={{ color: outOfStock ? "var(--red-600)" : "var(--green-700)" }}>
                {outOfStock ? "All copies on loan" : `${book.availableQuantity} available`}
              </dd>
            </div>
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