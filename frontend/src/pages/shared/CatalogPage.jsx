// Shared (librarian + admin) — the staff catalog.
//
// Two changes from the librarian-only version this replaces:
//
//  1. Admins can reach it. The backend always allowed admin writes on /books,
//     but no admin route existed — so if no librarian was available, nobody
//     could correct a catalog record.
//
//  2. "Remove" is now "Withdraw". Hard-deleting a catalog row destroys the
//     loan history that references it, and borrow_records uses ON DELETE
//     RESTRICT so it fails outright on any title ever borrowed. Withdrawal
//     takes the title out of circulation and keeps everything. Deletion is
//     admin-only and refuses anything with history.
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Archive, BookOpen, Search, Upload, RotateCcw, Trash2 } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
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

export default function CatalogPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { base, canDeleteBooks } = usePortal();
  const [params] = useSearchParams();

  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Seeded from ?search= so a topbar search lands here pre-filtered.
  const [query, setQuery] = useState(params.get("search") || "");
  const [genre, setGenre] = useState("");
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const [withdrawing, setWithdrawing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const debouncedQuery = useDebounce(query, 250);

  // The topbar searches as you type and rewrites ?search=, so keep the field
  // in step with the URL rather than reading it once on mount.
  useEffect(() => { setQuery(params.get("search") || ""); }, [params]);

  useEffect(() => {
    let cancelled = false;
    getGenres()
      .then((g) => { if (!cancelled) setGenres(g); })
      .catch(() => { /* the filter is optional — a failure just leaves it empty */ });
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setBooks(await getBooks({ search: debouncedQuery, genre, includeWithdrawn: showWithdrawn }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, genre, showWithdrawn]);

  // Filtering as you type: every settled keystroke refetches.
  useEffect(() => { load(); }, [load]);

  async function confirmWithdraw() {
    setBusy(true);
    try {
      const res = await withdrawBook(withdrawing.id, reason.trim() || undefined);
      toast.success(
        res.copiesStillOnLoan
          ? `“${withdrawing.title}” withdrawn. ${res.copiesStillOnLoan} copy/copies are still out and can still be returned.`
          : `“${withdrawing.title}” is out of circulation.`
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
      toast.success(`“${book.title}” is back in circulation.`);
      await load();
    } catch (e) {
      toast.error(e.message || "Could not restore that title.");
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await deleteBook(deleting.id);
      toast.success(`Deleted “${deleting.title}”.`);
      setDeleting(null);
      await load();
    } catch (e) {
      // The backend refuses anything with loan history and explains why, so
      // pass its message through rather than a generic failure.
      toast.error(e.message || "Could not delete that title.");
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Catalog</h1>
      <p className="page-sub">Manage the library’s books.</p>

      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input
              placeholder="Search by title or author…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar__filter">
            <Select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              options={[
                { value: "", label: "All genres" },
                ...genres.map(({ genre: g, count }) => ({ value: g, label: `${g} (${count})` })),
              ]}
            />
          </div>
          <Button variant="ghost" onClick={() => navigate(`${base}/books/import`)}>
            <Upload size={16} /> Import CSV
          </Button>
          <Button variant="green" onClick={() => navigate(`${base}/books/new`)}>
            <Plus size={16} /> Add New Book
          </Button>
        </div>

        {/* Off by default: a withdrawn title is one staff deliberately took out
            of the shelves, and it should not clutter the working catalog. */}
        <div style={{ margin: "4px 0 16px" }}>
          <Toggle checked={showWithdrawn} onChange={setShowWithdrawn} label="Show withdrawn titles" />
        </div>

        {loading && <div className="state"><div className="state__spinner" />Loading catalog…</div>}
        {error && !loading && <div className="state">Couldn’t load the catalog. {error.message}</div>}

        {!loading && !error && (
          <>
            <p className="page-sub" style={{ margin: "0 0 14px" }}>
              {books.length} {books.length === 1 ? "book" : "books"}
              {genre ? ` in ${genre}` : ""}{query ? ` matching “${query}”` : ""}
            </p>

            {books.length === 0 ? (
              <div className="state">
                <Search size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
                No books match that search.
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
                              {/* Only an admin sees this, and the backend still
                                  refuses any title that has been borrowed. */}
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
            toast.success(`Saved “${saved.title}”.`);
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
            <strong>{withdrawing.title}</strong> will stop appearing in the member catalog and cannot
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
            Titles that have ever been borrowed cannot be deleted — that loan history is the library’s
            record of who borrowed what. Withdraw those instead.
          </p>
        </Modal>
      )}
    </div>
  );
}
