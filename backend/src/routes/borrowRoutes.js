const express = require('express');
const router = express.Router();
const { borrowBook, returnBook } = require('../controllers/borrowController');
const { requireAuth } = require('../middleware/authMiddleware');

// Both routes require a logged-in user (req.user is set by requireAuth)
router.post('/borrow', requireAuth, borrowBook);
router.post('/return', requireAuth, returnBook);

module.exports = router;