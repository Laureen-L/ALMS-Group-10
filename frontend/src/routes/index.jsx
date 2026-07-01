// Route tree. Pages are lazy-loaded so each screen ships its own chunk.
// Persons 2–5 only touch their page files — this map already points at them.
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout.jsx";
import StudentLayout from "../layouts/StudentLayout.jsx";
import AdminLayout from "../layouts/AdminLayout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";
import { ROLES } from "../constants/roles.js";
import HomeRedirect from "./HomeRedirect.jsx";

// auth
const LoginPage = lazy(() => import("../pages/auth/LoginPage.jsx"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage.jsx"));
// student
const StudentDashboard = lazy(() => import("../pages/student/DashboardPage.jsx"));
const SearchBooks = lazy(() => import("../pages/student/SearchBooksPage.jsx"));
const BookDetail = lazy(() => import("../pages/student/BookDetailPage.jsx"));
const MyBorrowings = lazy(() => import("../pages/student/MyBorrowingsPage.jsx"));
const BorrowingHistory = lazy(() => import("../pages/student/BorrowingHistoryPage.jsx"));
const StudentProfile = lazy(() => import("../pages/student/ProfilePage.jsx"));
// librarian
const LibrarianDashboard = lazy(() => import("../pages/librarian/DashboardPage.jsx"));
const AddBook = lazy(() => import("../pages/librarian/AddBookPage.jsx"));
const BorrowingActivity = lazy(() => import("../pages/librarian/BorrowingActivityPage.jsx"));
const OverdueManagement = lazy(() => import("../pages/librarian/OverdueManagementPage.jsx"));
const Members = lazy(() => import("../pages/librarian/MembersPage.jsx"));
// admin
const AdminDashboard = lazy(() => import("../pages/admin/DashboardPage.jsx"));
const UserManagement = lazy(() => import("../pages/admin/UserManagementPage.jsx"));
const BorrowRecords = lazy(() => import("../pages/admin/BorrowRecordsPage.jsx"));
const AdminCatalog = lazy(() => import("../pages/admin/CatalogPage.jsx"));
const Reports = lazy(() => import("../pages/admin/ReportsPage.jsx"));
// shared
const SettingsPage = lazy(() => import("../pages/shared/SettingsPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/shared/NotFoundPage.jsx"));

const Fallback = () => <div className="state"><div className="state__spinner" />Loading…</div>;

// Librarian uses the admin shell with its own nav; demo badge count for overdue.
const LibrarianShell = () => <AdminLayout role={ROLES.LIBRARIAN} badges={{ overdue: 23 }} />;
const AdminShell = () => <AdminLayout role={ROLES.ADMIN} />;

export default function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        {/* Public */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Student */}
        <Route element={<ProtectedRoute><RoleRoute allow={[ROLES.STUDENT]}><StudentLayout /></RoleRoute></ProtectedRoute>}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/search" element={<SearchBooks />} />
          <Route path="/student/catalog/:bookId" element={<BookDetail />} />
          <Route path="/student/borrowings" element={<MyBorrowings />} />
          <Route path="/student/history" element={<BorrowingHistory />} />
          <Route path="/student/profile" element={<StudentProfile />} />
        </Route>

        {/* Librarian */}
        <Route element={<ProtectedRoute><RoleRoute allow={[ROLES.LIBRARIAN]}><LibrarianShell /></RoleRoute></ProtectedRoute>}>
          <Route path="/librarian/dashboard" element={<LibrarianDashboard />} />
          <Route path="/librarian/books/new" element={<AddBook />} />
          <Route path="/librarian/activity" element={<BorrowingActivity />} />
          <Route path="/librarian/overdue" element={<OverdueManagement />} />
          <Route path="/librarian/members" element={<Members />} />
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute><RoleRoute allow={[ROLES.ADMIN]}><AdminShell /></RoleRoute></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/borrow-records" element={<BorrowRecords />} />
          <Route path="/admin/catalog" element={<AdminCatalog />} />
          <Route path="/admin/reports" element={<Reports />} />
        </Route>

        {/* Settings — any signed-in role */}
        <Route element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
