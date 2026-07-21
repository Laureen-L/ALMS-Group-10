// Librarian — Add New Book. Now posts to the real backend (POST /books).
// Backend accepts: title, author, genre, published_year.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import { validateRequired } from "../../utils/validators.js";
import { createBook } from "../../services/bookService.js";

export default function AddBookPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", author: "", genre: "Technology", publishedYear: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    const next = {
      title: validateRequired(form.title, "Title"),
      author: validateRequired(form.author, "Author"),
    };
    setErrors(next);
    if (next.title || next.author) return;

    setBusy(true);
    try {
      await createBook(form);
      navigate("/librarian/dashboard");
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
            <Select label="Genre" value={form.genre} onChange={set("genre")}
              options={["Technology", "Science", "Business", "Engineering", "Arts & Humanities"]} />
            <Input label="Published Year" type="number" value={form.publishedYear} onChange={set("publishedYear")} placeholder="e.g. 2008" />
          </div>
          <div style={{ marginTop: 20 }} className="row">
            <Button type="submit" variant="green" disabled={busy}><Save size={16} /> {busy ? "Saving…" : "Save Book"}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/librarian/dashboard")}>Cancel</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}