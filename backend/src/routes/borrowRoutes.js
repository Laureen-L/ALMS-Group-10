const express = require('express');
const router = express.Router();
const { borrowBook, returnBook, renewLoan } = require('../controllers/borrowController');
const { requireAuth } = require('../middleware/authMiddleware');

// All three require a logged-in user (req.user is set by requireAuth).
// The controllers enforce "your own loan, or any loan if you are staff" on top.
router.post('/borrow', requireAuth, borrowBook);
router.post('/return', requireAuth, returnBook);

// Extends an open loan. A member may renew their own; staff may renew anyone's.
router.post('/renew', requireAuth, renewLoan);

module.exports = router;
