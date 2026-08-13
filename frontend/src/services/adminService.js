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
    member: r.users?.full_name || r.member_name || r.full_name || shortId(r.user_id),
    memberEmail: r.users?.email || null,
    title: r.books?.title || "—",
    author: r.books?.author || "—",
    isbn: r.books?.isbn || null,
    borrowed: formatDate(r.borrow_date),
    due: formatDate(r.due_date),
    // Raw date kept for "days overdue" arithmetic.
    dueRaw: r.due_date || null,
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
        { id: 3, userId: 3, member: "Dr. Isaac Manu", title: "Introduction to Algorithms", author: "Thomas H. Cormen", borrowed: "Aug 01, 2023", due: "Sep 01, 2023", dueRaw: new Date(Date.now() - 12 * 864e5).toISOString(), status: "overdue" }
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
      { id: 1, name: "Kwame Nkrumah", email: "student@knust.edu.gh", role: "student", isActive: true, joined: "Jan 12, 2023" },
      { id: 2, name: "Ama Serwaa", email: "librarian@knust.edu.gh", role: "librarian", isActive: true, joined: "Feb 05, 2023" },
      { id: 3, name: "Dr. Isaac Manu", email: "admin@knust.edu.gh", role: "admin", isActive: true, joined: "Mar 10, 2023" },
      { id: 4, name: "Yaa Asantewaa", email: "yaa@knust.edu.gh", role: "student", isActive: false, joined: "Apr 02, 2023" }
    ];
  }

  const data = await api.get("/admin/members");
  return (data || []).map((m) => ({
    id: m.id,
    name: m.full_name,
    email: m.email,
    role: m.role,
    // Drives the Active/Deactivated badge and which action the edit modal offers.
    isActive: m.is_active !== false,
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
      { id: 3, userId: 3, member: "Dr. Isaac Manu", title: "Introduction to Algorithms", borrowed: "Aug 01, 2023", due: "Sep 01, 2023", dueRaw: new Date(Date.now() - 12 * 864e5).toISOString(), status: "overdue" }
    ];
  }

  const data = await api.get("/admin/overdue");
  return (data || []).map(mapRecord);
}

// GET /admin/members/:id (staff)
//
// The member list answered none of the questions asked at a circulation desk.
// This is the screen that does: what they hold, how much of their allowance is
// used, what is late, what they owe.
export async function getMemberDetail(memberId) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return {
      member: {
        id: memberId, full_name: "Kwame Nkrumah", email: "student@knust.edu.gh",
        phone: "0244000000", role: "student", is_active: true, created_at: "2023-01-12",
      },
      openLoans: [
        { id: "l1", due_date: new Date(Date.now() + 5 * 864e5).toISOString(), status: "active",
          renewal_count: 0, books: { id: 1, title: "The Pragmatic Programmer", author: "David Thomas", isbn: "9780135957059" } },
        { id: "l2", due_date: new Date(Date.now() - 6 * 864e5).toISOString(), status: "overdue",
          renewal_count: 2, books: { id: 3, title: "Introduction to Algorithms", author: "Thomas H. Cormen", isbn: "9780262033848" } },
      ],
      history: [
        { id: "l3", borrow_date: "2026-03-05", return_date: "2026-03-20", status: "returned",
          books: { id: 5, title: "Refactoring", author: "Martin Fowler" } },
      ],
      fines: [{ id: "f1", amount: 4.5, status: "unpaid", issued_at: "2026-08-02", notes: "9 day(s) late" }],
      summary: {
        openLoans: 2, overdueLoans: 1, borrowLimit: 5, atLimit: false,
        totalBorrowed: 3, outstandingFines: 4.5,
      },
    };
  }

  const d = await api.get(`/admin/members/${memberId}`);
  return {
    member: d.member,
    openLoans: d.openLoans || [],
    history: d.history || [],
    fines: d.fines || [],
    summary: d.summary || {},
  };
}

// POST /admin/members/invite (admin)
//
// The only route to a librarian account used to be: sign up as a student, then
// get promoted. Sends an invitation rather than setting a password — an
// administrator should never handle someone else's credentials.
export async function inviteMember({ email, fullName, role = "librarian" }) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return { success: true, message: `Invitation sent to ${email}.`, user: { email, full_name: fullName, role } };
  }
  return api.post("/admin/members/invite", { email, full_name: fullName, role });
}

// GET /admin/due-soon?days= (staff)
//
// The preventive counterpart to /admin/overdue: loans about to fall due, so
// the desk can call these members before it becomes a fine.
export async function getDueSoon(days) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return {
      days: days ?? 3,
      records: [
        { id: 5, userId: 1, member: "Kwame Nkrumah", memberEmail: "student@knust.edu.gh", phone: "0244000000",
          title: "Clean Code", due: "Tomorrow", dueRaw: new Date(Date.now() + 864e5).toISOString(), status: "active" },
      ],
    };
  }

  const qs = days ? `?days=${days}` : "";
  const d = await api.get(`/admin/due-soon${qs}`);
  return {
    days: d.days,
    records: (d.records || []).map((r) => ({ ...mapRecord(r), phone: r.users?.phone || null })),
  };
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