const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getLibrarianDashboard,
  getMembers,
  getBorrowRecords,
  getOverdueRecords,
  getAdminStats,
} = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Student Dashboard - authenticated users only
// Full URL: GET /api/admin/student/dashboard/:id
router.get('/student/dashboard/:id', requireAuth, getStudentDashboard);

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