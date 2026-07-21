// Book catalog API — wired to the real backend (Dev B contract, base /api/books).
// Each function maps the backend's book shape to what our screens expect, and
// fills safe defaults for fields the backend doesn't send yet (isbn, availability).
import { api } from "./apiClient.js";

function mapBook(b) {
  if (!b) return null;
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    publishedYear: b.published_year,
    createdAt: b.created_at,
    // fields not in the current backend book model — safe defaults:
    isbn: b.isbn || null,
    available: b.available !== undefined ? b.available : true,
    qty: b.quantity !== undefined ? b.quantity : null,
  };
}

const MOCK_BOOKS = [
  { id: 1, title: "The Pragmatic Programmer", author: "David Thomas", genre: "Computer Science", publishedYear: 1999, isbn: "978-0135957059", available: true, qty: 5 },
  { id: 2, title: "Clean Code", author: "Robert C. Martin", genre: "Software Engineering", publishedYear: 2008, isbn: "978-0132350884", available: true, qty: 3 },
  { id: 3, title: "Introduction to Algorithms", author: "Thomas H. Cormen", genre: "Computer Science", publishedYear: 2009, isbn: "978-0262033848", available: false, qty: 0 },
  { id: 4, title: "Design Patterns", author: "Erich Gamma", genre: "Software Engineering", publishedYear: 1994, isbn: "978-0201633610", available: true, qty: 2 },
  { id: 5, title: "Refactoring", author: "Martin Fowler", genre: "Software Engineering", publishedYear: 1999, isbn: "978-0201485677", available: true, qty: 4 }
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
    return results;
  }

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (genre) params.set("genre", genre);
  const qs = params.toString();
  const data = await api.get(`/books${qs ? `?${qs}` : ""}`);
  return (Array.isArray(data) ? data : []).map(mapBook);
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
export async function createBook({ title, author, genre, publishedYear }) {
  const res = await api.post("/books", {
    title, author, genre,
    published_year: publishedYear ? Number(publishedYear) : undefined,
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