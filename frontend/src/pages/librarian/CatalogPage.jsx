// Librarian — Catalog. Real books (GET /books) with remove (DELETE /books/:id).
// Laid out as a card grid rather than a table, so it reads like the student
// browse shelf: cover, genre, title, stock, then the management actions.
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, BookOpen, Search } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getBooks, getGenres, deleteBook } from "../../services/bookService.js";
import EditBookModal from "../../components/books/EditBookModal.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CatalogPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Seeded from ?search= so a topbar search lands here pre-filtered.
  const [query, setQuery] = useState(params.get("search") || "");
  const [genre, setGenre] = useState("");
  const [removing, setRemoving] = useState(null);
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  const debouncedQuery = useDebounce(query, 250);

  // The topbar searches as you type and rewrites ?search=, so keep the field
  // in step with the URL rather than reading it once on mount.
  useEffect(() => {
    setQuery(params.get("search") || "");
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    getGenres()
      .then((g) => { if (!cancelled) setGenres(g); })
      .catch(() => { /* the filter is optional — a failure just leaves it empty */ });
    return () => { cancelled = true; };
  }, []);

  // Filtering as you type: every settled keystroke refetches.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const results = await getBooks({ search: debouncedQuery, genre });
        if (!cancelled) setBooks(results);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery, genre]);

  function reload() {
    getBooks({ search: debouncedQuery, genre }).then(setBooks).catch(setError);
  }

  async function confirmRemove() {
    const title = removing.title;
    try {
      await deleteBook(removing.id);
      setRemoving(null);
      toast.success(`Removed “${title}” from the catalog.`);
      reload();
    } catch (e) {
      setRemoving(null);
      toast.error(e.message || "Could not remove that book.");
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
          <Button variant="green" onClick={() => navigate("/librarian/books/new")}>
            <Plus size={16} /> Add New Book
          </Button>
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
                  return (
                    <div key={b.id} className={["cat-card", out && "cat-card--out"].filter(Boolean).join(" ")}>
                      <div className="cat-card__top">
                        <div className="book-card__cover"><BookOpen size={22} /></div>
                        <div className="cat-card__body">
                          <Badge tone="green">{b.genre || "Book"}</Badge>
                          <span className="book-card__title" style={{ marginTop: 8 }}>{b.title}</span>
                          <div className="book-card__author">By {b.author}</div>
                          {b.isbn && <div className="book-card__isbn">ISBN {b.isbn}</div>}
                        </div>
                      </div>

                      <div className="cat-card__foot">
                        <span className={["cat-card__stock", out && "cat-card__stock--out"].filter(Boolean).join(" ")}>
                          {out
                            ? "All copies out"
                            : `${b.availableQuantity} of ${b.qty ?? b.availableQuantity} available`}
                        </span>
                        <span className="actions-cell">
                          <button className="act-edit" onClick={() => setEditing(b)}><Pencil size={14} /> Edit</button>
                          <button className="act-remove" onClick={() => setRemoving(b)}><Trash2 size={14} /> Remove</button>
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
            setBooks((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
            toast.success(`Saved “${saved.title}”.`);
          }}
        />
      )}

      {removing && (
        <Modal title="Remove this book?" onClose={() => setRemoving(null)}
          footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" onClick={confirmRemove}>Remove book</Button></>}>
          <p>Remove <strong>{removing.title}</strong>? This can’t be undone.</p>
        </Modal>
      )}
    </div>
  );
}
