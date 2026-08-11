const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getLibrarianDashboard,
  getMembers,
  getBorrowRecords,
  getOverdueRecords,
  getAdminStats,
  updateMemberRole,
  deactivateMember,
  getGenreReport,
  getBorrowingTrends,
  getTopBooks,
} = require('../controllers/adminController');
// Student Dashboard - authenticated users only
// Full URL: GET /api/admin/stats
router.get('/stats', requireAuth, requireRole(['admin']), getAdminStats);

// Task 8 (Dev D): Role Change + Account Deactivation
// Full URL: PUT /api/admin/members/:id/deactivate
router.put('/members/:id/deactivate', requireAuth, requireRole(['admin']), deactivateMember);

// Task 9 (Dev D): Reports Endpoints
// Full URL: PUT /api/admin/members/:id/deactivate
router.put('/members/:id/deactivate', requireAuth, requireRole(['admin']), deactivateMember);

// Task 9 (Dev D): Reports Endpoints
// Full URL: GET /api/admin/reports/genres
router.get('/reports/genres', requireAuth, requireRole(['admin']), getGenreReport);

// Full URL: GET /api/admin/reports/trends
router.get('/reports/trends', requireAuth, requireRole(['admin']), getBorrowingTrends);

// Full URL: GET /api/admin/reports/top-books
router.get('/reports/top-books', requireAuth, requireRole(['admin']), getTopBooks);

module.exports = router;
// Librarian Dashboard
// Full URL: GET /api/admin/librarian/dashboard
router.get('/librarian/dashboard', requireAuth, requireRole(['librarian', 'admin']), getLibrarianDashboard);

// Admin routes
// Full URL: GET /api/admin/members
router.get('/members', requireAuth, requireRole(['admin']), getMembers);

// Full URL: GET /api/admin/borrow-records
router.get('/borrow-records', requireAuth, requireRole(['admin', 'librarian']), getBorrowRecords);

// Full URL: GET /api/admin/overdue
router.get('/overdue', requireAuth, requireRole(['admin', 'librarian']), getOverdueRecords);

// Full URL: GET /api/admin/stats
router.get('/stats', requireAuth, requireRole(['admin']), getAdminStats);

module.exports = router;