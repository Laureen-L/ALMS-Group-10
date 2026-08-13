const supabase = require('../config/supabaseClient');

/*
 * Favorites — a member's saved books.
 * Requires the `favorites` table (prisma/migrations/20260808130000_favorites).
 *
 * Every handler below is mounted behind requireAuth and only ever acts on
 * :id after checking it against the token holder, so one member can't read
 * or edit another's list.
 */

// A member may only touch their own favorites; admins may act on anyone's.
const canAccess = (req) => req.params.id === req.user.id || req.user.role === 'admin';

/**
 * POST /api/students/:id/favorites
 * Body: { book_id }
 */
const addFavorite = async (req, res) => {
  try {
    if (!canAccess(req)) {
      return res.status(403).json({ error: 'You can only edit your own favorites' });
    }

    const { book_id } = req.body;
    if (!book_id) return res.status(400).json({ error: 'book_id is required' });

    // upsert rather than insert: favoriting twice is a no-op, not a 409.
    const { error } = await supabase
      .from('favorites')
      .upsert({ user_id: req.params.id, book_id }, { onConflict: 'user_id,book_id' });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('addFavorite error:', err);
    return res.status(500).json({ error: 'Failed to add favorite' });
  }
};

/**
 * DELETE /api/students/:id/favorites
 * Body: { book_id }
 */
const removeFavorite = async (req, res) => {
  try {
    if (!canAccess(req)) {
      return res.status(403).json({ error: 'You can only edit your own favorites' });
    }

    const { book_id } = req.body;
    if (!book_id) return res.status(400).json({ error: 'book_id is required' });

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', req.params.id)
      .eq('book_id', book_id);

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('removeFavorite error:', err);
    return res.status(500).json({ error: 'Failed to remove favorite' });
  }
};

/**
 * GET /api/students/:id/favorites
 * Returns the saved books themselves, not the join rows.
 */
const getFavorites = async (req, res) => {
  try {
    if (!canAccess(req)) {
      return res.status(403).json({ error: 'You can only view your own favorites' });
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('book_id, created_at, books(id, title, author, genre, isbn, available_quantity)')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    // Drop rows whose book has since been deleted.
    return res.status(200).json((data || []).map((f) => f.books).filter(Boolean));
  } catch (err) {
    console.error('getFavorites error:', err);
    return res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

module.exports = { addFavorite, removeFavorite, getFavorites };
