const express = require('express');
const router = express.Router();
const {
    getBooks,
    getGenres,
    getPopularBooks,
    getLowStock,
    getBookById,
    getBookDetail,
    createBook,
    updateBook,
    withdrawBook,
    restoreBook,
    deleteBook,
    importBooks
} = require('../controllers/bookController');

//imported the middleware here as named(authMiddleware)
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const requireStaff = [requireAuth, requireRole(['admin', 'librarian'])];
const requireAdmin = [requireAuth, requireRole(['admin'])];

// Public endpoints (FR-05, FR-06, FR-07)
// NOTE: literal paths must stay above '/:id' or they get matched as a book id.
router.get('/', getBooks);
router.get('/genres', getGenres);
router.get('/popular', getPopularBooks);

// Staff reporting. Above '/:id' for the same reason as the two above.
router.get('/low-stock', requireStaff, getLowStock);

router.get('/:id', getBookById);

// The staff view of one title: current holders and loan history alongside the
// catalogue row. Members get '/:id' above, which carries neither.
router.get('/:id/detail', requireStaff, getBookDetail);

// Protected endpoints - Librarian/Admin only (FR-08)
router.post('/', requireStaff, createBook);
router.post('/import', requireStaff, importBooks);
router.put('/:id', requireStaff, updateBook);

// Withdrawal is the librarian's way to take a title out of circulation. It
// keeps the catalogue row, its loan history and any fines raised against it.
router.put('/:id/withdraw', requireStaff, withdrawBook);
router.put('/:id/restore', requireStaff, restoreBook);

// DELETE is admin-only, and the controller still refuses any title with loan
// history. This used to be open to librarians, which made destroying a
// catalogue record — the most damaging action in the system — a button on a
// table row at the circulation desk.
router.delete('/:id', requireAdmin, deleteBook);

module.exports = router;
