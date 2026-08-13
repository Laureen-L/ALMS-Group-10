const express = require('express');
const router = express.Router();
const {
  addFavorite,
  removeFavorite,
  getFavorites,
} = require('../controllers/studentController');
const { requireAuth } = require('../middleware/authMiddleware');

// Favorites — the controller checks :id against the token holder.
// Full URLs: /api/students/:id/favorites
router.get('/:id/favorites', requireAuth, getFavorites);
router.post('/:id/favorites', requireAuth, addFavorite);
router.delete('/:id/favorites', requireAuth, removeFavorite);

module.exports = router;
