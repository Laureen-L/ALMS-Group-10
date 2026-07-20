// Borrow / Return API + the student's loan lists.
// - borrow/return: Dev C contract (POST /borrow, POST /return)
// - loan lists come from the student dashboard endpoint (Dev D):
//   GET /admin/student/dashboard/:userId -> { activeLoans, overdueLoans, borrowHistory, summary }
import { api } from "./apiClient.js";
import { formatDate } from "../utils/formatDate.js";

// Map a backend loan (with nested `books`) to the flat shape our tables use.
function mapLoan(l) {
  if (!l) return null;
  return {
    id: l.id,
    bookId: l.book_id,
    title: l.books?.title || "—",
    author: l.books?.author || "—",
    borrowed: formatDate(l.borrow_date),
    due: formatDate(l.due_date),
    returned: formatDate(l.return_date),
    status: l.status, // "active" | "overdue" | "returned"
  };
}

// POST /borrow { bookId } -> { message, borrow }
export async function borrow(bookId) {
  const res = await api.post("/borrow", { bookId });
  return mapLoan(res.borrow);
}

// POST /return { borrowId } -> { message, borrow }
export async function returnBook(borrowId) {
  const res = await api.post("/return", { borrowId });
  return res.borrow;
}

// GET /admin/student/dashboard/:userId -> mapped loan lists + summary
export async function getStudentDashboard(userId) {
  const data = await api.get(`/admin/student/dashboard/${userId}`);
  return {
    active: (data.activeLoans || []).map(mapLoan),
    overdue: (data.overdueLoans || []).map(mapLoan),
    history: (data.borrowHistory || []).map(mapLoan),
    summary: data.summary || { totalActive: 0, totalOverdue: 0, totalBorrowed: 0 },
  };
}