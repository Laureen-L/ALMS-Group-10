// Admin & dashboard API (Dev D contract, base /api/admin).
import { api } from "./apiClient.js";
import { formatDate } from "../utils/formatDate.js";

function shortId(id) { return id ? String(id).slice(0, 8) : "—"; }

// map a borrow/overdue record (nested `books`) to a flat row
function mapRecord(r) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    member: r.member_name || r.full_name || shortId(r.user_id),
    title: r.books?.title || "—",
    author: r.books?.author || "—",
    isbn: r.books?.isbn || null,
    borrowed: formatDate(r.borrow_date),
    due: formatDate(r.due_date),
    returned: formatDate(r.return_date),
    status: r.status,
  };
}

// GET /admin/librarian/dashboard
export async function getLibrarianDashboard() {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return {
      stats: { totalBooks: 1200, activeLoans: 45, overdueLoans: 3 },
      recentActivity: [
        { id: 1, userId: 1, member: "Kwame Nkrumah", title: "The Pragmatic Programmer", author: "David Thomas", borrowed: "Oct 12, 2023", due: "Nov 12, 2023", status: "active" },
        { id: 2, userId: 2, member: "Ama Serwaa", title: "Clean Code", author: "Robert C. Martin", borrowed: "Oct 15, 2023", due: "Nov 15, 2023", status: "active" }
      ],
      overdueList: [
        { id: 3, userId: 3, member: "Dr. Isaac Manu", title: "Introduction to Algorithms", author: "Thomas H. Cormen", borrowed: "Aug 01, 2023", due: "Sep 01, 2023", status: "overdue" }
      ],
    };
  }

  const d = await api.get("/admin/librarian/dashboard");
  return {
    stats: d.stats || { totalBooks: 0, activeLoans: 0, overdueLoans: 0 },
    recentActivity: (d.recentActivity || []).map(mapRecord),
    overdueList: (d.overdueList || []).map(mapRecord),
  };
}

// GET /admin/members
export async function getMembers() {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return [
      { id: 1, name: "Kwame Nkrumah", email: "student@knust.edu.gh", role: "student", joined: "Jan 12, 2023" },
      { id: 2, name: "Ama Serwaa", email: "librarian@knust.edu.gh", role: "librarian", joined: "Feb 05, 2023" },
      { id: 3, name: "Dr. Isaac Manu", email: "admin@knust.edu.gh", role: "admin", joined: "Mar 10, 2023" }
    ];
  }

  const data = await api.get("/admin/members");
  return (data || []).map((m) => ({
    id: m.id,
    name: m.full_name,
    email: m.email,
    role: m.role,
    joined: formatDate(m.created_at),
  }));
}

// GET /admin/borrow-records
export async function getBorrowRecords() {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return [
      { id: 1, userId: 1, member: "Kwame Nkrumah", title: "The Pragmatic Programmer", borrowed: "Oct 12, 2023", due: "Nov 12, 2023", status: "active" },
      { id: 2, userId: 2, member: "Ama Serwaa", title: "Clean Code", borrowed: "Oct 15, 2023", due: "Nov 15, 2023", status: "active" },
      { id: 4, userId: 1, member: "Kwame Nkrumah", title: "Design Patterns", borrowed: "Jan 10, 2023", due: "Jan 25, 2023", status: "returned" }
    ];
  }

  const data = await api.get("/admin/borrow-records");
  return (data || []).map(mapRecord);
}

// GET /admin/overdue
export async function getOverdue() {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return [
      { id: 3, userId: 3, member: "Dr. Isaac Manu", title: "Introduction to Algorithms", borrowed: "Aug 01, 2023", due: "Sep 01, 2023", status: "overdue" }
    ];
  }

  const data = await api.get("/admin/overdue");
  return (data || []).map(mapRecord);
}

// GET /admin/stats
export async function getAdminStats() {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return {
      totalBooks: 1200,
      totalMembers: 450,
      activeLoans: 45,
      overdueLoans: 3,
      borrowsPerMonth: [
        { month: "Jan", count: 120 }, { month: "Feb", count: 190 }, { month: "Mar", count: 155 },
        { month: "Apr", count: 250 }, { month: "May", count: 320 }, { month: "Jun", count: 280 },
        { month: "Jul", count: 405 }, { month: "Aug", count: 550 }, { month: "Sep", count: 480 },
        { month: "Oct", count: 610 }, { month: "Nov", count: 580 }, { month: "Dec", count: 720 },
      ],
      topBooks: [
        { title: "The Pragmatic Programmer", author: "David Thomas", borrows: 142 },
        { title: "Clean Code", author: "Robert C. Martin", borrows: 98 },
        { title: "Design Patterns", author: "Erich Gamma", borrows: 75 },
        { title: "Refactoring", author: "Martin Fowler", borrows: 64 },
        { title: "Introduction to Algorithms", author: "Thomas H. Cormen", borrows: 51 },
      ],
    };
  }

  const d = await api.get("/admin/stats");
  return {
    totalBooks: d.totalBooks ?? 0,
    totalMembers: d.totalMembers ?? 0,
    activeLoans: d.activeLoans ?? 0,
    overdueLoans: d.overdueLoans ?? 0,
    borrowsPerMonth: d.borrowsPerMonth || [],
  };
}