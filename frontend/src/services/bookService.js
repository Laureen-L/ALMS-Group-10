// Book catalog API — wired to the real backend (Dev B contract, base /api/books).
// Each function maps the backend's book shape to what our screens expect, and
// fills safe defaults for fields the backend doesn't send yet (isbn, availability).
import { api } from "./apiClient.js";

function mapBook(b) {
  if (!b) return null;
  // The books table tracks stock as available_quantity; `available` is just
  // the boolean view of it that the older screens read.
  const availableQuantity = b.available_quantity ?? (b.available === false ? 0 : 1);
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    createdAt: b.created_at,
    isbn: b.isbn || null,
    availableQuantity,
    available: availableQuantity > 0,
    qty: b.quantity !== undefined ? b.quantity : null,
  };
}

// Orders results the way a reader expects. With a search term the closest
// matches lead — an exact title, then a title starting with what was typed,
// then a word inside the title, then the author — so the list stays useful
// from the very first keystroke. Without one, plain alphabetical by title.
function rankBooks(books, search = "") {
  const q = search.trim().toLowerCase();
  const byTitle = (a, b) => (a.title || "").localeCompare(b.title || "");
  if (!q) return [...books].sort(byTitle);

  const score = (b) => {
    const title = (b.title || "").toLowerCase();
    const author = (b.author || "").toLowerCase();
    if (title === q) return 0;
    if (title.startsWith(q)) return 1;
    if (title.split(/\s+/).some((w) => w.startsWith(q))) return 2;
    if (title.includes(q)) return 3;
    if (author.startsWith(q)) return 4;
    if (author.includes(q)) return 5;
    return 6; // matched on something else (genre, ISBN) — keep it, but last.
  };

  return [...books].sort((a, b) => score(a) - score(b) || byTitle(a, b));
}

const MOCK_BOOKS = [
  { id: 1, title: "The Pragmatic Programmer", author: "David Thomas", genre: "Computer Science", isbn: "978-0135957059", available: true, availableQuantity: 3, qty: 5 },
  { id: 2, title: "Clean Code", author: "Robert C. Martin", genre: "Software Engineering", isbn: "978-0132350884", available: true, availableQuantity: 2, qty: 3 },
  { id: 3, title: "Introduction to Algorithms", author: "Thomas H. Cormen", genre: "Computer Science", isbn: "978-0262033848", available: false, availableQuantity: 0, qty: 3 },
  { id: 4, title: "Design Patterns", author: "Erich Gamma", genre: "Software Engineering", isbn: "978-0201633610", available: true, availableQuantity: 1, qty: 2 },
  { id: 5, title: "Refactoring", author: "Martin Fowler", genre: "Software Engineering", isbn: "978-0201485677", available: true, availableQuantity: 4, qty: 4 },
  { id: 6, title: "Things Fall Apart", author: "Chinua Achebe", genre: "Fiction", isbn: "978-0385474542", available: true, availableQuantity: 6, qty: 6 },
  { id: 7, title: "A Brief History of Time", author: "Stephen Hawking", genre: "Physics", isbn: "978-0553380163", available: true, availableQuantity: 2, qty: 2 }
];

// GET /books?search=&genre=
export async function getBooks({ search = "", genre = "" } = {}) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    let results = [...MOCK_BOOKS];
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    if (genre && genre !== "All") {
      results = results.filter(b => b.genre === genre);
    }
    return rankBooks(results, search);
  }

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (genre) params.set("genre", genre);
  const qs = params.toString();
  const data = await api.get(`/books${qs ? `?${qs}` : ""}`);
  return rankBooks((Array.isArray(data) ? data : []).map(mapBook), search);
}

// GET /books/genres -> [{ genre, count }] sorted alphabetically.
// Powers the genre browse grid on the student search screen.
export async function getGenres() {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    const counts = {};
    MOCK_BOOKS.forEach((b) => { counts[b.genre] = (counts[b.genre] || 0) + 1; });
    return Object.entries(counts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => a.genre.localeCompare(b.genre));
  }
  const data = await api.get("/books/genres");
  return Array.isArray(data) ? data : [];
}

// GET /books/popular -> the 5 most-borrowed books, each with borrow_count.
export async function getPopularBooks() {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return [
      { ...MOCK_BOOKS[0], borrowCount: 142 },
      { ...MOCK_BOOKS[1], borrowCount: 98 },
      { ...MOCK_BOOKS[3], borrowCount: 75 },
      { ...MOCK_BOOKS[5], borrowCount: 44 },
      { ...MOCK_BOOKS[6], borrowCount: 31 },
    ];
  }
  const data = await api.get("/books/popular");
  return (Array.isArray(data) ? data : []).map((b) => ({
    ...mapBook(b),
    borrowCount: b.borrow_count ?? 0,
  }));
}

// GET /books/:id
export async function getBook(id) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    const book = MOCK_BOOKS.find((b) => b.id === Number(id));
    if (!book) throw new Error("Book not found in mock data.");
    return book;
  }
  return mapBook(await api.get(`/books/${id}`));
}

// POST /books  (librarian/admin) -> { message, book }
// New stock starts fully available, so available_quantity mirrors quantity.
export async function createBook({ title, author, isbn, genre, quantity = 1 }) {
  const res = await api.post("/books", {
    title,
    author,
    genre,
    isbn: isbn?.trim() ? isbn.trim() : null, // unique-when-present, so send null not ""
    quantity: Number(quantity),
    available_quantity: Number(quantity),
  });
  return mapBook(res.book);
}

// PUT /books/:id -> { message, book }
export async function updateBook(id, patch) {
  const res = await api.put(`/books/${id}`, patch);
  return mapBook(res.book);
}

// DELETE /books/:id -> { message }
export async function deleteBook(id) {
  return api.del(`/books/${id}`);
}