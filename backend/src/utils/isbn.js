/*
 * ISBNs are printed with hyphens ("978-0-13-235088-4") but books.isbn is
 * VARCHAR(13), so the hyphenated form is 1-4 characters too long to store —
 * an insert fails with a raw Postgres "value too long" error.
 *
 * Worse, lookups match exactly (`.eq('isbn', …)`), so a book stored bare and
 * scanned hyphenated — or the reverse — reads back as "Book not found" with
 * nothing to indicate why.
 *
 * Everything therefore stores and looks up the bare form: digits, plus a
 * trailing X for the ISBN-10 check digit. Normalise on both sides of every
 * comparison and the two formats stop mattering.
 */

/**
 * Strip formatting from an ISBN. Returns null for empty input, so callers can
 * pass the result straight through to a nullable column.
 */
const normalizeIsbn = (value) => {
  if (value === undefined || value === null) return null;
  const bare = String(value).replace(/[^0-9Xx]/g, '').toUpperCase();
  return bare.length ? bare : null;
};

/** ISBN-10 and ISBN-13 are the only lengths the column can hold. */
const isValidIsbn = (bare) => bare === null || bare.length === 10 || bare.length === 13;

module.exports = { normalizeIsbn, isValidIsbn };
