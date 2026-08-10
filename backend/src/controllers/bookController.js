const supabase = require('../config/supabaseClient');

const getBooks = async (req, res) => {
    try {
        const { search, genre } = req.query;
        let query = supabase.from('books').select('*');

        if (genre) query = query.eq('genre', genre);
        // Match either title or author — the search box offers both.
        if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);

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
        const { data, error } = await supabase.from('books').insert([req.body]).select();

        if (error) return res.status(400).json({ error: error.message });

        res.status(201).json({ message: 'Book created successfully', book: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('books').update(req.body).eq('id', id).select();

        if (error) return res.status(400).json({ error: error.message });

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