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
    // Unformatted date kept alongside the display string so screens can do
    // "days left" arithmetic without re-parsing "Nov 12, 2023".
    dueRaw: l.due_date || null,
    returned: formatDate(l.return_date),
    status: l.status, // "active" | "overdue" | "returned"
  };
}

let mockDashboardData = {
  active: [
    { id: 101, bookId: 1, title: "The Pragmatic Programmer", author: "David Thomas", borrowed: "Oct 12, 2023", due: "Nov 12, 2023", dueRaw: new Date(Date.now() + 9 * 864e5).toISOString(), status: "active" },
    { id: 102, bookId: 2, title: "Clean Code", author: "Robert C. Martin", borrowed: "Oct 15, 2023", due: "Nov 15, 2023", dueRaw: new Date(Date.now() + 2 * 864e5).toISOString(), status: "active" }
  ],
  overdue: [
    { id: 103, bookId: 3, title: "Introduction to Algorithms", author: "Thomas H. Cormen", borrowed: "Aug 01, 2023", due: "Sep 01, 2023", dueRaw: new Date(Date.now() - 6 * 864e5).toISOString(), status: "overdue" }
  ],
  history: [
    { id: 104, bookId: 4, title: "Design Patterns", author: "Erich Gamma", borrowed: "Jan 10, 2023", returned: "Jan 25, 2023", status: "returned" },
    { id: 105, bookId: 5, title: "Refactoring", author: "Martin Fowler", borrowed: "Mar 05, 2023", returned: "Mar 20, 2023", status: "returned" }
  ],
  summary: { totalActive: 2, totalOverdue: 1, totalBorrowed: 5 }
};

// POST /borrow { bookId } -> { message, borrow }
export async function borrow(bookId) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    const newBorrow = { id: Math.floor(Math.random() * 10000), bookId, title: `Book ${bookId}`, author: "Unknown", borrowed: "Just now", due: "Next month", status: "active" };
    mockDashboardData.active.push(newBorrow);
    mockDashboardData.summary.totalActive++;
    mockDashboardData.summary.totalBorrowed++;
    return newBorrow;
  }
  const res = await api.post("/borrow", { bookId });
  return mapLoan(res.borrow);
}

// POST /return { borrowId } -> { message, borrow }
export async function returnBook(borrowId) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    const activeIndex = mockDashboardData.active.findIndex(b => b.id === borrowId);
    if (activeIndex !== -1) {
      const book = mockDashboardData.active.splice(activeIndex, 1)[0];
      book.status = "returned";
      book.returned = "Just now";
      mockDashboardData.history.unshift(book);
      mockDashboardData.summary.totalActive--;
    } else {
      const overdueIndex = mockDashboardData.overdue.findIndex(b => b.id === borrowId);
      if (overdueIndex !== -1) {
        const book = mockDashboardData.overdue.splice(overdueIndex, 1)[0];
        book.status = "returned";
        book.returned = "Just now";
        mockDashboardData.history.unshift(book);
        mockDashboardData.summary.totalOverdue--;
      }
    }
    return { success: true, message: "Book returned" };
  }
  const res = await api.post("/return", { borrowId });
  return res.borrow;
}

// --- Circulation desk (librarian, scans an ISBN rather than picking a book id) ---

// POST /borrow { isbn, memberEmail }
export async function checkOutByIsbn(isbn, memberEmail) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    if (!isbn) throw new Error("ISBN is required");
    if (!memberEmail) throw new Error("Member email is required");
    return { message: "Book checked out successfully" };
  }
  return api.post("/borrow", { isbn, memberEmail });
}

// POST /return { isbn }
export async function returnByIsbn(isbn) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    if (!isbn) throw new Error("ISBN is required");
    return { message: "Book returned successfully" };
  }
  return api.post("/return", { isbn });
}

// GET /admin/student/dashboard/:userId -> mapped loan lists + summary
export async function getStudentDashboard(userId) {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    return {
      active: [...mockDashboardData.active],
      overdue: [...mockDashboardData.overdue],
      history: [...mockDashboardData.history],
      summary: { ...mockDashboardData.summary }
    };
  }

  const data = await api.get(`/admin/student/dashboard/${userId}`);
  return {
    active: (data.activeLoans || []).map(mapLoan),
    overdue: (data.overdueLoans || []).map(mapLoan),
    history: (data.borrowHistory || []).map(mapLoan),
    summary: data.summary || { totalActive: 0, totalOverdue: 0, totalBorrowed: 0 },
  };
}