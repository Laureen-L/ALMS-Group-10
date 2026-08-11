// Librarian — Catalog, table-of-contents style. Books are grouped by genre with
// a jump-to index down the side, instead of one long flat table.
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { getBooks, deleteBook } from "../../services/bookService.js";
import EditBookModal from "../../components/books/EditBookModal.jsx";
import { useToast } from "../../context/ToastContext.jsx";

// Group a flat book list into [{ genre, books }] sorted alphabetically by genre.
function groupByGenre(books) {
  const map = new Map();
  for (const b of books) {
    const g = b.genre || "Uncategorised";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(b);
  }
  return [...map.entries()]
    .map(([genre, list]) => ({
      genre,
      books: list.sort((a, b) => (a.title || "").localeCompare(b.title || "")),
    }))
    .sort((a, b) => a.genre.localeCompare(b.genre));
}

const slug = (g) => "genre-" + g.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default function CatalogPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(params.get("search") || "");
  const [removing, setRemoving] = useState(null);
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  async function load(search = query) {
    setLoading(true); setError(null);
    try { setBooks(await getBooks({ search })); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const incoming = params.get("search") || "";
    setQuery(incoming);
    load(incoming);
  }, [params]);

  const groups = useMemo(() => groupByGenre(books), [books]);

  async function confirmRemove() {
    const title = removing.title;
    try {
      await deleteBook(removing.id);
      setRemoving(null);
      toast.success(`Removed “${title}” from the catalog.`);
      load();
    } catch (e) {
      setRemoving(null);
      toast.error(e.message || "Could not remove that book.");
    }
  }

  function jumpTo(genre) {
    const el = document.getElementById(slug(genre));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <h1 className="page-title">Catalog</h1>
      <p className="page-sub">Browse the library’s books by genre.</p>

      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input placeholder="Search by title or author…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button variant="ghost" onClick={() => load()}>Search</Button>
          <Button variant="green" onClick={() => navigate("/librarian/books/new")}><Plus size={16} /> Add New Book</Button>
        </div>

        {loading && <div className="state"><div className="state__spinner" />Loading catalog…</div>}
        {error && <div className="state">Couldn’t load the catalog. {error.message}</div>}
        {!loading && !error && books.length === 0 && (
          <div className="state">No books match your search.</div>
        )}

        {!loading && !error && books.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0, 1fr)", gap: 24, marginTop: 8 }}>
            <nav aria-label="Genres" style={{ position: "sticky", top: 12, alignSelf: "start", borderRight: "1px solid var(--border-soft)", paddingRight: 12 }}>
              <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)", margin: "0 0 10px" }}>Contents</p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                {groups.map((g) => (
                  <li key={g.genre}>
                    <button
                      onClick={() => jumpTo(g.genre)}
                      style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8, padding: "6px 8px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "var(--radius)", color: "var(--ink)", fontSize: 14, textAlign: "left" }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.genre}</span>
                      <span style={{ color: "var(--muted)" }}>{g.books.length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {groups.map((g) => (
                <section key={g.genre} id={slug(g.genre)} style={{ scrollMarginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: "1px solid var(--border-soft)", marginBottom: 10 }}>
                    <BookOpen size={16} />
                    <h2 style={{ fontSize: 16, margin: 0 }}>{g.genre}</h2>
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>{g.books.length} title{g.books.length === 1 ? "" : "s"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {g.books.map((b) => (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius)" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>
                            {b.author}{b.isbn ? ` · ISBN ${b.isbn}` : ""}
                          </div>
                        </div>
                        <Badge tone={b.available ? "green" : "red"}>{b.available ? "Available" : "Out"}</Badge>
                        <span className="actions-cell">
                          <button className="act-edit" onClick={() => setEditing(b)}><Pencil size={14} /> Edit</button>
                          <button className="act-remove" onClick={() => setRemoving(b)}><Trash2 size={14} /> Remove</button>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
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
