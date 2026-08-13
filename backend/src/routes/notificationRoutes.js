const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

// Every role has an inbox — a librarian can be a borrower too — so these are
// gated on being signed in and nothing more. Each handler scopes its query to
// the token holder, so there is no :id to check.
// Full URLs: /api/notifications
router.get('/', requireAuth, getNotifications);

// Before '/:id/read', so the literal path is never read as an id.
router.put('/read-all', requireAuth, markAllRead);
router.put('/:id/read', requireAuth, markRead);

module.exports = router;
