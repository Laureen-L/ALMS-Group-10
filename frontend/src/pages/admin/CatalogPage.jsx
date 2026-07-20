// Admin — Catalog. Real books (GET /books) with remove (DELETE /books/:id).
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getBooks, deleteBook } from "../../services/bookService.js";

export default function AdminCatalogPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try { setBooks(await getBooks({ search: query })); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function confirmRemove() {
    try { await deleteBook(removing.id); setRemoving(null); load(); }
    catch (e) { setError(e); setRemoving(null); }
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
          <Button variant="ghost" onClick={load}>Search</Button>
          <Button variant="green" onClick={() => navigate("/librarian/books/new")}><Plus size={16} /> Add New Book</Button>
        </div>
        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "title", header: "Title" },
            { key: "author", header: "Author" },
            { key: "genre", header: "Genre" },
            { key: "publishedYear", header: "Year" },
            { key: "actions", header: "Actions", render: (r) => (
              <span className="actions-cell">
                <button className="act-edit"><Pencil size={14} /> Edit</button>
                <button className="act-remove" onClick={() => setRemoving(r)}><Trash2 size={14} /> Remove</button>
              </span>
            ) },
          ]}
          rows={books}
          emptyMessage="No books in the catalog yet."
        />
      </Card>

      {removing && (
        <Modal title="Remove this book?" onClose={() => setRemoving(null)}
          footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" onClick={confirmRemove}>Remove book</Button></>}>
          <p>Remove <strong>{removing.title}</strong>? This can’t be undone.</p>
        </Modal>
      )}
    </div>
  );
}