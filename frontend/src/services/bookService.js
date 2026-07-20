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

// GET /books?search=&genre=
export async function getBooks({ search = "", genre = "" } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (genre) params.set("genre", genre);
  const qs = params.toString();
  const data = await api.get(`/books${qs ? `?${qs}` : ""}`);
  return (Array.isArray(data) ? data : []).map(mapBook);
}

// GET /books/:id
export async function getBook(id) {
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