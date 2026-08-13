const supabase = require('../config/supabaseClient');
const { normalizeIsbn, isValidIsbn } = require('../utils/isbn');

/*
 * The columns a librarian may set on a book. Everything else in the table is
 * owned elsewhere: `id` and `created_at` by the database, `updated_at` by
 * trg_books_updated_at, `added_by` by this controller from the caller's token.
 *
 * Whitelisting matters because the request body used to be handed to
 * .insert()/.update() whole, so a client could set any column it named —
 * reassigning `added_by`, or overwriting the loan-derived
 * `available_quantity`.
 */
const EDITABLE_FIELDS = ['title', 'author', 'isbn', 'genre', 'quantity', 'available_quantity'];

/**
 * Take only the editable fields the caller actually sent, normalising the ISBN
 * so stored and scanned values always match.
 * Returns { patch } or { error } with a message for the client.
 */
const buildBookPatch = (body = {}) => {
    const patch = {};

    for (const field of EDITABLE_FIELDS) {
        if (body[field] !== undefined) patch[field] = body[field];
    }

    if (patch.isbn !== undefined) {
        patch.isbn = normalizeIsbn(patch.isbn);
        if (!isValidIsbn(patch.isbn)) {
            return { error: 'ISBN must have 10 or 13 digits (hyphens and spaces are ignored).' };
        }
    }

    for (const field of ['quantity', 'available_quantity']) {
        if (patch[field] === undefined) continue;
        const n = Number(patch[field]);
        if (!Number.isInteger(n) || n < 0) {
            return { error: `${field} must be a whole number of 0 or more.` };
        }
        patch[field] = n;
    }

    // The CHECK constraint on books enforces this too, but as an opaque 400.
    if (patch.available_quantity > patch.quantity) {
        return { error: 'available_quantity cannot exceed quantity.' };
    }

    return { patch };
};

// PostgREST parses .or() as a comma-separated filter list, so an unescaped
// comma or parenthesis in the search term is read as filter syntax rather than
// as text. Drop those characters; `%` and `_` are left alone because a member
// typing them into a search box means them as wildcards.
const escapeFilterValue = (value) => String(value).replace(/[,()]/g, ' ');

const getBooks = async (req, res) => {
    try {
        const { search, genre } = req.query;
        let query = supabase.from('books').select('*');

        if (genre) query = query.eq('genre', genre);
        // Match either title or author — the search box offers both.
        if (search) {
            const term = escapeFilterValue(search);
            query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%`);
        }

        const { data, error } = await query;

        // Handle Supabase error directly instead of throwing
        if (error) return res.status(400).json({ error: error.message });

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/books/genres — every genre in the catalog with its book count.
// Counted in JS rather than SQL because supabase-js has no GROUP BY; if the
// catalog grows past the 1000-row default page this needs a Postgres RPC.
const getGenres = async (req, res) => {
    try {
        const { data, error } = await supabase.from('books').select('genre');

        if (error) return res.status(400).json({ error: error.message });

        const counts = {};
        (data || []).forEach((b) => {
            if (!b.genre) return; // genre is nullable — skip unclassified books
            counts[b.genre] = (counts[b.genre] || 0) + 1;
        });

        const result = Object.entries(counts)
            .map(([genre, count]) => ({ genre, count }))
            .sort((a, b) => a.genre.localeCompare(b.genre));

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/books/popular — the 5 most-borrowed titles, all time.
// Counted in JS for the same reason as getGenres (no GROUP BY in supabase-js).
const getPopularBooks = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('borrow_records')
            .select('book_id, books(id, title, author, genre, available_quantity)');

        if (error) return res.status(400).json({ error: error.message });

        const counts = {};
        const bookData = {};
        (data || []).forEach((r) => {
            if (!r.books) return; // book deleted out from under the loan record
            counts[r.book_id] = (counts[r.book_id] || 0) + 1;
            bookData[r.book_id] = r.books;
        });

        const top5 = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => ({ ...bookData[id], borrow_count: count }));

        res.status(200).json(top5);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('books').select('*').eq('id', id).single();

        if (error) return res.status(400).json({ error: error.message });
        if (!data) return res.status(404).json({ message: 'Book not found' });

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createBook = async (req, res) => {
    try {
        const { patch, error: patchError } = buildBookPatch(req.body);
        if (patchError) return res.status(400).json({ error: patchError });

        // Required by the schema, and a clearer message than Postgres gives.
        if (!patch.title || !patch.author) {
            return res.status(400).json({ error: 'Title and author are required.' });
        }

        // FR-08: record which member of staff added the record. Taken from the
        // verified token, never from the body.
        const { data, error } = await supabase
            .from('books')
            .insert([{ ...patch, added_by: req.user.id }])
            .select();

        if (error) return res.status(400).json({ error: error.message });

        res.status(201).json({ message: 'Book created successfully', book: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { patch, error: patchError } = buildBookPatch(req.body);
        if (patchError) return res.status(400).json({ error: patchError });

        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ error: 'Nothing to update.' });
        }

        const { data, error } = await supabase.from('books').update(patch).eq('id', id).select();

        if (error) return res.status(400).json({ error: error.message });
        if (!data || data.length === 0) return res.status(404).json({ error: 'Book not found' });

        res.status(200).json({ message: 'Book updated successfully', book: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('books').delete().eq('id', id);

        if (error) return res.status(400).json({ error: error.message });

        res.status(200).json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getBooks, getGenres, getPopularBooks, getBookById, createBook, updateBook, deleteBook };