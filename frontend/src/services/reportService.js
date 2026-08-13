// Services — analytics reports (base /api/admin/reports).
import { api } from "./apiClient.js";

const USE_MOCK = () => import.meta.env.VITE_USE_MOCK !== "false";

// GET /admin/reports/genres -> [{ genre, count }]
export async function getGenreReport() {
  if (USE_MOCK()) {
    return [
      { genre: "Computer Science", count: 320 },
      { genre: "Software Engineering", count: 240 },
      { genre: "Fiction", count: 180 },
      { genre: "Physics", count: 120 },
      { genre: "History", count: 90 },
      { genre: "Economics", count: 60 },
    ];
  }
  const data = await api.get("/admin/reports/genres");
  return Array.isArray(data) ? data : [];
}

// GET /admin/reports/trends -> [{ month: "2026-07", count }]
export async function getTrendsReport() {
  if (USE_MOCK()) {
    return [
      { month: "2026-02", count: 18 }, { month: "2026-03", count: 24 },
      { month: "2026-04", count: 20 }, { month: "2026-05", count: 30 },
      { month: "2026-06", count: 27 }, { month: "2026-07", count: 41 },
      { month: "2026-08", count: 35 },
    ];
  }
  const data = await api.get("/admin/reports/trends");
  return Array.isArray(data) ? data : [];
}

// GET /admin/reports/top-books -> [{ title, author, borrow_count }]
export async function getTopBooks() {
  if (USE_MOCK()) {
    return [
      { title: "The Pragmatic Programmer", author: "David Thomas", borrow_count: 142 },
      { title: "Clean Code", author: "Robert C. Martin", borrow_count: 98 },
      { title: "Design Patterns", author: "Erich Gamma", borrow_count: 75 },
      { title: "Refactoring", author: "Martin Fowler", borrow_count: 64 },
      { title: "Introduction to Algorithms", author: "Thomas H. Cormen", borrow_count: 51 },
      { title: "Things Fall Apart", author: "Chinua Achebe", borrow_count: 44 },
    ];
  }
  const data = await api.get("/admin/reports/top-books");
  return Array.isArray(data) ? data : [];
}

// GET /admin/reports/overdue-rate -> { total, overdue, rate }
export async function getOverdueRate() {
  if (USE_MOCK()) return { total: 45, overdue: 3, rate: 6.7 };
  return api.get("/admin/reports/overdue-rate");
}

// GET /admin/reports/top-borrowers -> [{ full_name, email, borrow_count }]
export async function getTopBorrowers() {
  if (USE_MOCK()) {
    return [
      { full_name: "Kwame Nkrumah", email: "student@knust.edu.gh", borrow_count: 22 },
      { full_name: "Ama Serwaa", email: "librarian@knust.edu.gh", borrow_count: 17 },
      { full_name: "Dr. Isaac Manu", email: "admin@knust.edu.gh", borrow_count: 9 },
    ];
  }
  const data = await api.get("/admin/reports/top-borrowers");
  return Array.isArray(data) ? data : [];
}

// POST /admin/send-overdue-reminders
//   -> { totalOverdue, notified, alreadyNotified, remindersSent,
//        smsConfigured, skipped, failed, notifyFailed }
// Pass a loanId to remind one member; omit it to remind everyone overdue.
//
// Two channels: every overdue member gets an in-app notification, and those
// with a usable phone number are also texted when Termii is configured.
// The mock leaves smsConfigured false, which is the state the app is actually
// in until the Termii sender ID is approved.
export async function sendOverdueReminders(loanId) {
  if (USE_MOCK()) {
    return loanId
      ? {
          success: true, totalOverdue: 1, notified: 1, alreadyNotified: 0,
          remindersSent: 0, smsConfigured: false, skipped: [], failed: [], notifyFailed: [],
        }
      : {
          success: true, totalOverdue: 3, notified: 3, alreadyNotified: 0,
          remindersSent: 0, smsConfigured: false, skipped: [], failed: [], notifyFailed: [],
        };
  }
  return api.post("/admin/send-overdue-reminders", loanId ? { loanId } : undefined);
}
