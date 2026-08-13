const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getLibrarianDashboard,
  getMembers,
  getMemberDetail,
  inviteMember,
  getBorrowRecords,
  getOverdueRecords,
  getDueSoon,
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
const { getSystemSettings, updateSystemSettings } = require('../controllers/settingsController');
const { getAuditLog } = require('../controllers/auditController');
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

// One member in full: open loans, allowance used, overdue count, fines,
// history. Staff — this is the screen the circulation desk works from.
// Above '/members/:id/...' is unnecessary here, but keep it above the
// mutations for readability.
router.get('/members/:id', requireStaff, getMemberDetail);

// Member administration — admin only (FR-16)
// Creating staff by invitation, so no one ever handles someone else's password.
router.post('/members/invite', requireAdmin, inviteMember);
router.put('/members/:id/role', requireAdmin, updateMemberRole);
router.put('/members/:id/deactivate', requireAdmin, deactivateMember);
router.put('/members/:id/reactivate', requireAdmin, reactivateMember);

// Full URL: GET /api/admin/borrow-records
router.get('/borrow-records', requireStaff, getBorrowRecords);

// Full URL: GET /api/admin/overdue
router.get('/overdue', requireStaff, getOverdueRecords);

// The preventive counterpart to /overdue: loans about to fall due, so the desk
// can act before they become overdue notices and fines.
router.get('/due-soon', requireStaff, getDueSoon);

// Full URL: GET /api/admin/stats
router.get('/stats', requireAuth, requireRole(['admin']), getAdminStats);

// Library policy (loan period, borrow limit, fine rate, renewals).
// Readable by staff, because the circulation and fines desks display the
// numbers they are enforcing. Writable by admins only — it is policy.
router.get('/settings', requireStaff, getSystemSettings);
router.put('/settings', requireAdmin, updateSystemSettings);

// Who did what. Admin only, and read-only by design — there is deliberately no
// route here that edits or deletes an entry.
router.get('/audit', requireAdmin, getAuditLog);

// Reports (FR-18)
//
// Split by what the report is *for*, not by seniority. Librarians get the
// operational ones — they decide what to reorder and which loans to chase, and
// cannot do either without these numbers. Genre mix and top borrowers stay
// with admins: the first is collection strategy, and the second is a list of
// named people ranked by their reading habits.
router.get('/reports/trends', requireStaff, getTrendsReport);
router.get('/reports/top-books', requireStaff, getTopBooksReport);
router.get('/reports/overdue-rate', requireStaff, getOverdueRateReport);
router.get('/reports/genres', requireAdmin, getGenreReport);
router.get('/reports/top-borrowers', requireAdmin, getTopBorrowersReport);

// Overdue reminders.
//
// Staff, because a librarian works the overdue desk — but the two cases are
// not the same action. A body carrying { loanId } reminds one member and is
// routine; an empty body messages every overdue member at once, costs SMS
// credit, and is recorded in the audit log by the controller.
router.post('/send-overdue-reminders', requireStaff, sendOverdueReminders);

module.exports = router;
