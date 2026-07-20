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
  const d = await api.get("/admin/librarian/dashboard");
  return {
    stats: d.stats || { totalBooks: 0, activeLoans: 0, overdueLoans: 0 },
    recentActivity: (d.recentActivity || []).map(mapRecord),
    overdueList: (d.overdueList || []).map(mapRecord),
  };
}

// GET /admin/members
export async function getMembers() {
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
  const data = await api.get("/admin/borrow-records");
  return (data || []).map(mapRecord);
}

// GET /admin/overdue
export async function getOverdue() {
  const data = await api.get("/admin/overdue");
  return (data || []).map(mapRecord);
}

// GET /admin/stats
export async function getAdminStats() {
  const d = await api.get("/admin/stats");
  return {
    totalBooks: d.totalBooks ?? 0,
    totalMembers: d.totalMembers ?? 0,
    activeLoans: d.activeLoans ?? 0,
    overdueLoans: d.overdueLoans ?? 0,
    borrowsPerMonth: d.borrowsPerMonth || [],
  };
}