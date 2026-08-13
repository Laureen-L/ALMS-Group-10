const express = require('express');
const router = express.Router();
const { getFines, getMyFines, payFine, waiveFine } = require('../controllers/fineController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const requireStaff = [requireAuth, requireRole(['admin', 'librarian'])];
const requireAdmin = [requireAuth, requireRole(['admin'])];

// Before '/', so the literal path is never read as a query on the staff list.
// Scoped to the token holder inside the controller — there is no :id to swap.
// Full URLs: /api/fines
router.get('/mine', requireAuth, getMyFines);

// The fines desk: every fine, filterable by status or member.
router.get('/', requireStaff, getFines);

// Taking payment is desk work, so a librarian records it.
router.put('/:id/pay', requireStaff, payFine);

// Waiving is not. It cancels a debt outright, which is a policy decision
// rather than a transaction — so librarians take money but cannot write it off.
router.put('/:id/waive', requireAdmin, waiveFine);

module.exports = router;
