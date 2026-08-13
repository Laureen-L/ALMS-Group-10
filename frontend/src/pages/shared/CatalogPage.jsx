// Shared (librarian + admin) — Browse Books.
//
// Replaces the flat catalog with the same two-step genre-first flow the
// student SearchBooksPage uses: pick a genre, then search inside it.
// All staff actions (edit, withdraw, restore, delete) are preserved in
// the second step.
//
// TopBar ?search= lands here pre-filtered and skips straight to results
// across every genre.
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Pencil, Archive, BookOpen, Search, Upload, RotateCcw, Trash2, ArrowLeft,
} from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Toggle from "../../components/ui/Toggle.jsx";
import {
  getBooks, getGenres, withdrawBook, restoreBook, deleteBook,
} from "../../services/bookService.js";
import EditBookModal from "../../components/books/EditBookModal.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePortal } from "../../hooks/usePortal.js";

// Soft tint per genre — same palette the student screen uses so the two
// portals feel related rather than separate apps.
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

export default function CatalogPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { base, canDeleteBooks } = usePortal();
  const [params, setParams] = useSearchParams();

  // --- Genre grid state ---
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [genresError, setGenresError] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);

  // --- Book results state ---
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(params.get("search") || "");
  const [showWithdrawn, setShowWithdrawn] = useState(false);

  // --- Staff action state ---
  const [withdrawing, setWithdrawing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const debouncedQuery = useDebounce(query, 250);

  // A ?search= in the URL means "search everything", so skip the genre grid.
  const searchingAll = !selectedGenre && !!params.get("search");
  const showResults = !!selectedGenre || searchingAll;

  // --- Fetch genres ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGenresLoading(true);
      try {
        const g = await getGenres();
        if (!cancelled) setGenres(g);
      } catch (e) {
        if (!cancelled) setGenresError(e);
      } finally {
        if (!cancelled) setGenresLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // The topbar searches as you type and rewrites ?search=, so keep the field
  // in step with the URL rather than reading it once on mount. A topbar search
  // also drops the current genre — it's meant to reach everything, and staying
  // inside one genre would silently hide most of the matches.
  useEffect(() => {
    const incoming = params.get("search");
    if (incoming === null) { setQuery(""); return; }
    setQuery(incoming);
    if (incoming) setSelectedGenre(null);
  }, [params]);

  // --- Fetch books when a genre is selected or search is active ---
  const load = useCallback(async () => {
    if (!showResults) return;
    setLoading(true); setError(null);
    try {
      setBooks(await getBooks({
        search: debouncedQuery,
        genre: selectedGenre || "",
        includeWithdrawn: showWithdrawn,
      }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedGenre, showWithdrawn, showResults]);

  useEffect(() => { load(); }, [load]);

  function backToGenres() {
    setSelectedGenre(null);
    setQuery("");
    setBooks([]);
    setParams({}, { replace: true });
  }

  // --- Staff actions ---
  async function confirmWithdraw() {
    setBusy(true);
    try {
      const res = await withdrawBook(withdrawing.id, reason.trim() || undefined);
      toast.success(
        res.copiesStillOnLoan
          ? `"${withdrawing.title}" withdrawn. ${res.copiesStillOnLoan} copy/copies are still out and can still be returned.`
          : `"${withdrawing.title}" is out of circulation.`
      );
      setWithdrawing(null); setReason("");
      await load();
    } catch (e) {
      toast.error(e.message || "Could not withdraw that title.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(book) {
    try {
      await restoreBook(book.id);
      toast.success(`"${book.title}" is back in circulation.`);
      await load();
    } catch (e) {
      toast.error(e.message || "Could not restore that title.");
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await deleteBook(deleting.id);
      toast.success(`Deleted "${deleting.title}".`);
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e.message || "Could not delete that title.");
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  // ===================== STEP 1: Genre Grid =====================
  if (!showResults) {
    return (
      <div>
        <div className="row row--between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">Browse by Genre</h1>
            <p className="page-sub">Pick a shelf to see what's on it.</p>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={() => navigate(`${base}/books/import`)}>
              <Upload size={16} /> Import CSV
            </Button>
            <Button variant="green" onClick={() => navigate(`${base}/books/new`)}>
              <Plus size={16} /> Add New Book
            </Button>
          </div>
        </div>

        {genresLoading && <div className="state"><div className="state__spinner" />Loading genres…</div>}
        {genresError && !genresLoading && <div className="state">Couldn't load genres. {genresError.message}</div>}

        {!genresLoading && !genresError && (
          genres.length === 0 ? (
            <div className="state">No genres yet. Add a book to get started.</div>
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

  // ===================== STEP 2: Books in Genre =====================
  return (
    <div>
      <button className="link-btn" onClick={backToGenres} style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={16} /> Back to Genres
      </button>

      <div className="row row--between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">{selectedGenre || "Search Results"}</h1>
          <p className="page-sub">
            {selectedGenre ? `Books shelved under ${selectedGenre}.` : "Matches across every genre."}
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => navigate(`${base}/books/import`)}>
            <Upload size={16} /> Import CSV
          </Button>
          <Button variant="green" onClick={() => navigate(`${base}/books/new`)}>
            <Plus size={16} /> Add New Book
          </Button>
        </div>
      </div>

      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input
              placeholder="Search by title or author…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Off by default: a withdrawn title is one staff deliberately took out
            of the shelves, and it should not clutter the working view. */}
        <div style={{ margin: "4px 0 16px" }}>
          <Toggle checked={showWithdrawn} onChange={setShowWithdrawn} label="Show withdrawn titles" />
        </div>

        {loading && <div className="state"><div className="state__spinner" />Loading books…</div>}
        {error && !loading && <div className="state">Couldn't load books. {error.message}</div>}

        {!loading && !error && (
          <>
            <p className="page-sub" style={{ margin: "0 0 14px" }}>
              {books.length} {books.length === 1 ? "book" : "books"}
              {selectedGenre ? ` in ${selectedGenre}` : ""}{query ? ` matching "${query}"` : ""}
            </p>

            {books.length === 0 ? (
              <div className="state">
                <Search size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
                No books found{selectedGenre ? ` in ${selectedGenre}` : ""} matching your search.
              </div>
            ) : (
              <div className="catalog-grid">
                {books.map((b) => {
                  const out = b.availableQuantity <= 0;
                  const withdrawn = !b.inCirculation;
                  return (
                    <div
                      key={b.id}
                      className={["cat-card", (out || withdrawn) && "cat-card--out"].filter(Boolean).join(" ")}
                    >
                      <div className="cat-card__top">
                        <div className="book-card__cover"><BookOpen size={22} /></div>
                        <div className="cat-card__body">
                          <Badge tone={withdrawn ? "neutral" : "green"}>
                            {withdrawn ? "Withdrawn" : b.genre || "Book"}
                          </Badge>
                          <button
                            className="book-card__title link-btn"
                            style={{ marginTop: 8, textAlign: "left" }}
                            onClick={() => navigate(`${base}/catalog/${b.id}`)}
                          >
                            {b.title}
                          </button>
                          <div className="book-card__author">By {b.author}</div>
                          {b.isbn && <div className="book-card__isbn">ISBN {b.isbn}</div>}
                        </div>
                      </div>

                      <div className="cat-card__foot">
                        <span className={["cat-card__stock", out && "cat-card__stock--out"].filter(Boolean).join(" ")}>
                          {withdrawn
                            ? "Out of circulation"
                            : out
                              ? "All copies out"
                              : `${b.availableQuantity} of ${b.qty ?? b.availableQuantity} available`}
                        </span>
                        <span className="actions-cell">
                          {withdrawn ? (
                            <>
                              <button className="act-edit" onClick={() => restore(b)}>
                                <RotateCcw size={14} /> Restore
                              </button>
                              {canDeleteBooks && (
                                <button className="act-remove" onClick={() => setDeleting(b)}>
                                  <Trash2 size={14} /> Delete
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button className="act-edit" onClick={() => setEditing(b)}>
                                <Pencil size={14} /> Edit
                              </button>
                              <button className="act-remove" onClick={() => setWithdrawing(b)}>
                                <Archive size={14} /> Withdraw
                              </button>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Card>

      {editing && (
        <EditBookModal
          book={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setBooks((prev) => prev.map((b) => (b.id === saved.id ? { ...b, ...saved } : b)));
            toast.success(`Saved "${saved.title}".`);
          }}
        />
      )}

      {withdrawing && (
        <Modal
          title="Withdraw from circulation?"
          onClose={() => { setWithdrawing(null); setReason(""); }}
          footer={
            <>
              <Button variant="ghost" onClick={() => { setWithdrawing(null); setReason(""); }}>Cancel</Button>
              <Button variant="danger" loading={busy} onClick={confirmWithdraw}>Withdraw</Button>
            </>
          }
        >
          <p>
            <strong>{withdrawing.title}</strong> will stop appearing in the member view and cannot
            be borrowed. Its loan history is kept, and you can restore it at any time.
          </p>
          <Input
            label="Reason (optional)"
            placeholder="Damaged, lost, superseded edition…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Delete permanently?"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" loading={busy} onClick={confirmDelete}>Delete forever</Button>
            </>
          }
        >
          <p>
            This erases <strong>{deleting.title}</strong> from the database entirely. It cannot be undone.
          </p>
          <p className="page-sub">
            Titles that have ever been borrowed cannot be deleted — that loan history is the library's
            record of who borrowed what. Withdraw those instead.
          </p>
        </Modal>
      )}
    </div>
  );
}
