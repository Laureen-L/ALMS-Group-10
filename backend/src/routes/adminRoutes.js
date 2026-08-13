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
  reactivateMember,
  getGenreReport,
  getTrendsReport,
  getTopBooksReport,
  getOverdueRateReport,
  getTopBorrowersReport,
} = require('../controllers/adminController');
const { sendOverdueReminders } = require('../controllers/reminderController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Shorthands for the two guards used throughout this file.
const requireAdmin = [requireAuth, requireRole(['admin'])];
const requireStaff = [requireAuth, requireRole(['admin', 'librarian'])];

// Student Dashboard - authenticated users only
// Full URL: GET /api/admin/student/dashboard/:id
router.get('/student/dashboard/:id', requireAuth, getStudentDashboard);

// Librarian Dashboard
// Full URL: GET /api/admin/librarian/dashboard
router.get('/librarian/dashboard', requireStaff, getLibrarianDashboard);

// Members
// Librarians need the member list for the circulation desk, so they read it too.
router.get('/members', requireStaff, getMembers);

// Member administration — admin only (FR-16)
router.put('/members/:id/role', requireAdmin, updateMemberRole);
router.put('/members/:id/deactivate', requireAdmin, deactivateMember);
router.put('/members/:id/reactivate', requireAdmin, reactivateMember);

// Full URL: GET /api/admin/borrow-records
router.get('/borrow-records', requireStaff, getBorrowRecords);

// Full URL: GET /api/admin/overdue
router.get('/overdue', requireStaff, getOverdueRecords);

// Full URL: GET /api/admin/stats
router.get('/stats', requireAuth, requireRole(['admin']), getAdminStats);

// Reports (FR-18)
// Trends is also read by the librarian dashboard, so staff may see it.
router.get('/reports/genres', requireAdmin, getGenreReport);
router.get('/reports/trends', requireStaff, getTrendsReport);
router.get('/reports/top-books', requireAdmin, getTopBooksReport);
router.get('/reports/overdue-rate', requireAdmin, getOverdueRateReport);
router.get('/reports/top-borrowers', requireAdmin, getTopBorrowersReport);

// Overdue SMS reminders (stretch). Staff, because librarians work the overdue
// desk. Body may carry { loanId } to remind a single member.
router.post('/send-overdue-reminders', requireStaff, sendOverdueReminders);

module.exports = router;
