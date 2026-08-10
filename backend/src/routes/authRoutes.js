const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
  lookupMember,
  resetPassword,
  changePassword,
  forgotPassword,
} = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Public
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
// Authorised by the recovery token in the emailed link, not by a session.
router.post('/reset-password', resetPassword);

// Staff only — resolves an email to a member for the circulation desk.
router.get('/members/lookup', requireAuth, requireRole(['admin', 'librarian']), lookupMember);

// Authenticated — the controllers enforce "self or staff" on top of this.
router.get('/profile/:id', requireAuth, getProfile);
router.put('/profile/:id', requireAuth, updateProfile);
router.put('/password', requireAuth, changePassword);

module.exports = router;
