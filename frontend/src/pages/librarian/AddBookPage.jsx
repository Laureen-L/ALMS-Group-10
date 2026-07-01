// Librarian — Add New Book. Form with validation; saves to the catalog.
// MOCK submit; wire to bookService.create(form) later.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import { validateRequired } from "../../utils/validators.js";

export default function AddBookPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", author: "", isbn: "", genre: "CS", quantity: "1", shelf: "" });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function onSubmit(e) {
    e.preventDefault();
    const next = {
      title: validateRequired(form.title, "Title"),
      author: validateRequired(form.author, "Author"),
      isbn: validateRequired(form.isbn, "ISBN"),
    };
    setErrors(next);
    if (next.title || next.author || next.isbn) return;
    // TODO: bookService.create(form)
    console.log("create book", form);
    navigate("/librarian/dashboard");
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
          <div className="form-grid">
            <Input label="Title" value={form.title} onChange={set("title")} error={errors.title} />
            <Input label="Author" value={form.author} onChange={set("author")} error={errors.author} />
            <Input label="ISBN" value={form.isbn} onChange={set("isbn")} error={errors.isbn} placeholder="978-…" />
            <Select label="Genre" value={form.genre} onChange={set("genre")}
              options={["CS", "Engineering", "Business", "Science", "Arts & Humanities"]} />
            <Input label="Quantity" type="number" min="0" value={form.quantity} onChange={set("quantity")} />
            <Input label="Shelf location" value={form.shelf} onChange={set("shelf")} placeholder="e.g. A-12 / 402" />
          </div>
          <div style={{ marginTop: 20 }} className="row">
            <Button type="submit" variant="green"><Save size={16} /> Save Book</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/librarian/dashboard")}>Cancel</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}