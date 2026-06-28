const express = require('express');
const router = express.Router();
const {
    getBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook
} = require('../controllers/bookController');

//imported the middleware here as named(authMiddleware)
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Public endpoints (FR-05, FR-06, FR-07)
router.get('/', getBooks);
router.get('/:id', getBookById);

// Protected endpoints - Librarian/Admin only (FR-08)
router.post('/', requireAuth, requireRole(['admin', 'librarian']), createBook);
router.put('/:id', requireAuth, requireRole(['admin', 'librarian']), updateBook);
router.delete('/:id', requireAuth, requireRole(['admin', 'librarian']), deleteBook);

module.exports = router;