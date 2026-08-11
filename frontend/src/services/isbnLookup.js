// ISBN → book details, via the free Open Library API (no key required).
// Used by the barcode scanner on the Add Book screen to auto-fill title/author.
// This is a public third-party lookup, so it runs the same in mock and real mode.
import { GENRES } from "../constants/genres.js";

// Map an Open Library subject string onto one of our catalog genres, best-effort.
function guessGenre(subjects = []) {
  const hay = subjects.join(" ").toLowerCase();
  const table = [
    ["Computer Science", ["computer", "programming", "software", "algorithm"]],
    ["Mathematics", ["mathematic", "algebra", "calculus", "geometry"]],
    ["Physics", ["physics", "quantum", "mechanics", "astronomy"]],
    ["Chemistry", ["chemistry", "chemical"]],
    ["Biology", ["biology", "genetics", "ecology"]],
    ["Business", ["business", "management", "marketing"]],
    ["Economics", ["economic", "finance"]],
    ["History", ["history", "historical"]],
    ["Fiction", ["fiction", "novel", "fantasy", "romance"]],
    ["Self-Help", ["self-help", "self help", "personal"]],
  ];
  for (const [genre, keys] of table) {
    if (keys.some((k) => hay.includes(k)) && GENRES.includes(genre)) return genre;
  }
  return null;
}

// Normalise a scanned/typed ISBN to digits (and trailing X for ISBN-10).
export function normalizeIsbn(raw) {
  return String(raw || "").replace(/[^0-9Xx]/g, "").toUpperCase();
}

// Returns { title, author, genre, isbn } or null when nothing is found.
export async function lookupIsbn(rawIsbn) {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isbn) return null;

  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Lookup service is unavailable right now.");

  const data = await res.json();
  const record = data[`ISBN:${isbn}`];
  if (!record) return null;

  return {
    isbn,
    title: record.title || "",
    author: (record.authors || []).map((a) => a.name).join(", "),
    genre: guessGenre((record.subjects || []).map((s) => s.name || s)),
  };
}
