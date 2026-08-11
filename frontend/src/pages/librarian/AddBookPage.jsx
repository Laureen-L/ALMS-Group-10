// Librarian — Add New Book. Posts to the real backend (POST /books).
// Backend accepts: title, author, isbn, genre, quantity, available_quantity.
// There is NO published_year column — do not send one.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, ScanLine } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import BarcodeScanner from "../../components/books/BarcodeScanner.jsx";
import { validateRequired } from "../../utils/validators.js";
import { createBook } from "../../services/bookService.js";
import { lookupIsbn } from "../../services/isbnLookup.js";
import { GENRES } from "../../constants/genres.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function AddBookPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", author: "", isbn: "", genre: GENRES[0], quantity: "1",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // After a barcode is read: store the ISBN, then look the book up and pre-fill.
  async function handleScanned(code) {
    setScanning(false);
    setForm((f) => ({ ...f, isbn: code }));
    setLooking(true);
    try {
      const found = await lookupIsbn(code);
      if (found) {
        setForm((f) => ({
          ...f,
          isbn: found.isbn || code,
          title: found.title || f.title,
          author: found.author || f.author,
          genre: found.genre || f.genre,
        }));
        toast.success(`Found “${found.title || code}” — check the details and save.`);
      } else {
        toast.info(`Scanned ${code}, but no match was found. Enter the details manually.`);
      }
    } catch (e) {
      toast.error(e.message || "Lookup failed. Enter the details manually.");
    } finally {
      setLooking(false);
    }
  }

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
      navigate("/librarian/catalog");
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

          <div className="row row--between" style={{ alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 16, padding: "12px 14px", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: "var(--radius)" }}>
            <span className="page-sub" style={{ margin: 0 }}>
              {looking ? "Looking up book details…" : "Scan a book’s barcode to auto-fill its details."}
            </span>
            <Button type="button" variant="gold" onClick={() => setScanning(true)} disabled={looking}>
              <ScanLine size={16} /> Scan ISBN
            </Button>
          </div>

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
            <Button type="button" variant="ghost" onClick={() => navigate("/librarian/catalog")}>Cancel</Button>
          </div>
        </Card>
      </form>

      {scanning && (
        <BarcodeScanner onDetected={handleScanned} onClose={() => setScanning(false)} />
      )}
    </div>
  );
}
