// Staff (librarian + admin) — Add New Book. Posts to the real backend (POST /books).
// Backend accepts: title, author, isbn, genre, quantity, available_quantity.
// There is NO published_year column — do not send one.
//
// Mounted under both staff portals, so the "back to catalog" destination comes
// from usePortal rather than being hard-coded: an admin sent to
// /librarian/catalog would bounce straight off that portal's role guard.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import { validateRequired } from "../../utils/validators.js";
import { createBook } from "../../services/bookService.js";
import { GENRES } from "../../constants/genres.js";
import { usePortal } from "../../hooks/usePortal.js";

export default function AddBookPage() {
  const navigate = useNavigate();
  const { base } = usePortal();
  const [form, setForm] = useState({
    title: "", author: "", isbn: "", genre: GENRES[0], quantity: "1",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    const quantity = Number(form.quantity);
    const next = {
      title: validateRequired(form.title, "Title"),
      author: validateRequired(form.author, "Author"),
      quantity: Number.isInteger(quantity) && quantity > 0 ? "" : "Enter a whole number of copies (1 or more).",
    };
    setErrors(next);
    if (next.title || next.author || next.quantity) return;

    setBusy(true);
    try {
      await createBook({ ...form, quantity });
      navigate(`${base}/catalog`);
    } catch (err) {
      setErrors({ form: err.message || "Could not save the book." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="link-btn" onClick={() => navigate(-1)} style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="page-title">Add New Book</h1>
      <p className="page-sub">Add a new title to the library catalog.</p>

      <form onSubmit={onSubmit}>
        <Card>
          {errors.form && <p className="field__error" style={{ marginBottom: 12 }}>{errors.form}</p>}
          <div className="form-grid">
            <Input label="Title" value={form.title} onChange={set("title")} error={errors.title} />
            <Input label="Author" value={form.author} onChange={set("author")} error={errors.author} />
            <Input
              label="ISBN"
              value={form.isbn}
              onChange={set("isbn")}
              placeholder="e.g. 9780132350884"
            />
            <Select label="Genre" value={form.genre} onChange={set("genre")} options={GENRES} />
            <Input
              label="Number of copies"
              type="number"
              min="1"
              value={form.quantity}
              onChange={set("quantity")}
              error={errors.quantity}
            />
          </div>
          <p className="auth__hint" style={{ marginTop: 12 }}>
            Without an ISBN this book can’t be scanned at the circulation desk.
          </p>
          <div style={{ marginTop: 20 }} className="row">
            <Button type="submit" variant="green" disabled={busy}><Save size={16} /> {busy ? "Saving…" : "Save Book"}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate(`${base}/catalog`)}>Cancel</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
