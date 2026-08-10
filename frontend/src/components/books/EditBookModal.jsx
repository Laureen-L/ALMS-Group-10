// EditBookModal — edit a catalogue record in place. Shared by the librarian
// catalog and the librarian dashboard, which both list books.
//
// available_quantity is deliberately NOT editable: it's owned by the database
// trigger that tracks loans. Editing total copies adjusts availability by the
// same delta so the two stay consistent.
import { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import Button from "../ui/Button.jsx";
import { GENRES } from "../../constants/genres.js";
import { updateBook } from "../../services/bookService.js";

export default function EditBookModal({ book, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: book.title || "",
    author: book.author || "",
    isbn: book.isbn || "",
    genre: book.genre || GENRES[0],
    quantity: String(book.qty ?? 1),
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onLoan = (book.qty ?? 0) - (book.availableQuantity ?? 0);

  async function handleSave() {
    const quantity = Number(form.quantity);
    const next = {
      title: form.title.trim() ? "" : "Title is required.",
      author: form.author.trim() ? "" : "Author is required.",
      // Total copies can never drop below the number currently out on loan.
      quantity: !Number.isInteger(quantity) || quantity < 1
        ? "Enter a whole number of copies (1 or more)."
        : quantity < onLoan
          ? `${onLoan} copies are on loan — total can’t be below that.`
          : "",
    };
    setErrors(next);
    if (next.title || next.author || next.quantity) return;

    setBusy(true);
    try {
      const patch = {
        title: form.title.trim(),
        author: form.author.trim(),
        genre: form.genre,
        isbn: form.isbn.trim() ? form.isbn.trim() : null,
        quantity,
        // Keep availability in step with the change in total stock.
        available_quantity: Math.max(0, quantity - onLoan),
      };
      const saved = await updateBook(book.id, patch);
      onSaved(saved);
      onClose();
    } catch (e) {
      setErrors({ form: e.message || "Could not save this book." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Edit “${book.title}”`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="green" onClick={handleSave} loading={busy}>
            {busy ? "Saving…" : "Save Changes"}
          </Button>
        </>
      }
    >
      {errors.form && <p className="field__error" style={{ marginBottom: 12 }}>{errors.form}</p>}

      <div className="form-grid">
        <Input label="Title" value={form.title} onChange={set("title")} error={errors.title} />
        <Input label="Author" value={form.author} onChange={set("author")} error={errors.author} />
        <Input label="ISBN" value={form.isbn} onChange={set("isbn")} placeholder="e.g. 9780132350884" />
        <Select label="Genre" value={form.genre} onChange={set("genre")} options={GENRES} />
        <Input
          label="Total copies" type="number" min="1"
          value={form.quantity} onChange={set("quantity")} error={errors.quantity}
        />
      </div>

      <p className="page-sub" style={{ marginTop: 12, marginBottom: 0 }}>
        {onLoan > 0
          ? `${onLoan} of ${book.qty} copies are currently on loan.`
          : "All copies are on the shelf."}
      </p>
    </Modal>
  );
}
