const supabase = require('../config/supabaseClient');

const getBooks = async (req, res) => {
    try {
        const { search, genre } = req.query;
        let query = supabase.from('books').select('*');

        if (genre) query = query.eq('genre', genre);
        if (search) query = query.ilike('title', `%${search}%`);

        const { data, error } = await query;

        // Handle Supabase error directly instead of throwing
        if (error) return res.status(400).json({ error: error.message });

        res.status(200).json(data);
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

module.exports = { getBooks, getBookById, createBook, updateBook, deleteBook };