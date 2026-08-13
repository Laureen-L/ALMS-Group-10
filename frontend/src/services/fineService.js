// Fines for late returns (base /api/fines).
//
// The `fines` table shipped in the very first migration and nothing ever read
// or wrote it — the schema described a feature that did not exist. These are
// the calls behind the fines desk.
import { api } from "./apiClient.js";
import { formatDate } from "../utils/formatDate.js";

const USE_MOCK = () => import.meta.env.VITE_USE_MOCK !== "false";

// Amounts are GHS. Formatted here so every screen shows them identically.
export function formatMoney(amount) {
  return `GHS ${Number(amount || 0).toFixed(2)}`;
}

function mapFine(f) {
  if (!f) return null;
  const loan = f.borrow_records || {};
  return {
    id: f.id,
    amount: Number(f.amount) || 0,
    amountLabel: formatMoney(f.amount),
    status: f.status, // "unpaid" | "paid" | "waived"
    issued: formatDate(f.issued_at),
    notes: f.notes || null,
    borrowId: f.borrow_id,
    userId: f.user_id,
    member: f.users?.full_name || "—",
    memberEmail: f.users?.email || null,
    title: loan.books?.title || "—",
    author: loan.books?.author || "—",
    due: formatDate(loan.due_date),
    returned: formatDate(loan.return_date),
  };
}

const MOCK_FINES = [
  {
    id: "f1", amount: 4.5, amountLabel: "GHS 4.50", status: "unpaid", issued: "Aug 02, 2026",
    notes: "9 day(s) late at GHS 0.50/day", member: "Kwame Nkrumah", memberEmail: "student@knust.edu.gh",
    title: "Introduction to Algorithms", author: "Thomas H. Cormen", due: "Jul 24, 2026", returned: "Aug 02, 2026",
  },
  {
    id: "f2", amount: 1.5, amountLabel: "GHS 1.50", status: "paid", issued: "Jul 18, 2026",
    notes: "3 day(s) late at GHS 0.50/day", member: "Ama Serwaa", memberEmail: "librarian@knust.edu.gh",
    title: "Clean Code", author: "Robert C. Martin", due: "Jul 12, 2026", returned: "Jul 15, 2026",
  },
];

// GET /fines?status=&userId= — staff. Returns rows plus the totals the desk
// shows above the table, summed by the backend so this isn't a second request.
export async function getFines({ status = "", userId = "" } = {}) {
  if (USE_MOCK()) {
    const rows = MOCK_FINES.filter((f) => !status || f.status === status);
    return { fines: rows, totals: { unpaid: 4.5, paid: 1.5, waived: 0 }, count: rows.length };
  }

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (userId) params.set("userId", userId);
  const qs = params.toString();

  const data = await api.get(`/fines${qs ? `?${qs}` : ""}`);
  return {
    fines: (data.fines || []).map(mapFine),
    totals: data.totals || { unpaid: 0, paid: 0, waived: 0 },
    count: data.count ?? (data.fines || []).length,
  };
}

// GET /fines/mine — the signed-in member's own. Scoped to the token holder,
// so there is no id to pass.
export async function getMyFines() {
  if (USE_MOCK()) return { fines: [MOCK_FINES[0]], outstanding: 4.5 };

  const data = await api.get("/fines/mine");
  return {
    fines: (data.fines || []).map(mapFine),
    outstanding: Number(data.outstanding) || 0,
  };
}

// PUT /fines/:id/pay — librarian records a payment taken at the desk.
export async function payFine(fineId, notes) {
  if (USE_MOCK()) return { success: true, fine: { id: fineId, status: "paid" } };
  return api.put(`/fines/${fineId}/pay`, notes ? { notes } : undefined);
}

// PUT /fines/:id/waive — admin only. Cancelling a debt is a policy decision,
// so librarians take payment but cannot write one off.
export async function waiveFine(fineId, notes) {
  if (USE_MOCK()) return { success: true, fine: { id: fineId, status: "waived" } };
  return api.put(`/fines/${fineId}/waive`, notes ? { notes } : undefined);
}
