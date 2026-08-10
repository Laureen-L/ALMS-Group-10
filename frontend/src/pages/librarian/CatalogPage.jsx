// Librarian — Catalog. Real books (GET /books) with remove (DELETE /books/:id).
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getBooks, deleteBook } from "../../services/bookService.js";
import EditBookModal from "../../components/books/EditBookModal.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function CatalogPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Seeded from ?search= so a topbar search lands here pre-filtered.
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

  return (
    <div>
      <h1 className="page-title">Catalog</h1>
      <p className="page-sub">Manage the library’s books.</p>
      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input placeholder="Search by title…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button variant="ghost" onClick={() => load()}>Search</Button>
          <Button variant="green" onClick={() => navigate("/librarian/books/new")}><Plus size={16} /> Add New Book</Button>
        </div>
        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "title", header: "Title" },
            { key: "author", header: "Author" },
            { key: "genre", header: "Genre" },
            { key: "isbn", header: "ISBN" },
            { key: "actions", header: "Actions", render: (r) => (
              <span className="actions-cell">
                <button className="act-edit" onClick={() => setEditing(r)}><Pencil size={14} /> Edit</button>
                <button className="act-remove" onClick={() => setRemoving(r)}><Trash2 size={14} /> Remove</button>
              </span>
            ) },
          ]}
          rows={books}
          emptyMessage="No books in the catalog yet."
        />
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