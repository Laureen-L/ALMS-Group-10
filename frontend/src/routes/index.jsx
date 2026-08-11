// Route tree. Pages are lazy-loaded so each screen ships its own chunk.
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout.jsx";
import StudentLayout from "../layouts/StudentLayout.jsx";
import AdminLayout from "../layouts/AdminLayout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";
import RoleLayout from "./RoleLayout.jsx";
import { ROLES } from "../constants/roles.js";
import HomeRedirect from "./HomeRedirect.jsx";

// auth
const LoginPage = lazy(() => import("../pages/auth/LoginPage.jsx"));
const SignUpPage = lazy(() => import("../pages/auth/SignUpPage.jsx"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage.jsx"));
// student
const StudentDashboard = lazy(() => import("../pages/student/DashboardPage.jsx"));
const SearchBooks = lazy(() => import("../pages/student/SearchBooksPage.jsx"));
const BookDetail = lazy(() => import("../pages/student/BookDetailPage.jsx"));
const MyBorrowings = lazy(() => import("../pages/student/MyBorrowingsPage.jsx"));
// librarian
const LibrarianDashboard = lazy(() => import("../pages/librarian/DashboardPage.jsx"));
const AddBook = lazy(() => import("../pages/librarian/AddBookPage.jsx"));
const BorrowingActivity = lazy(() => import("../pages/librarian/BorrowingActivityPage.jsx"));
const OverdueManagement = lazy(() => import("../pages/librarian/OverdueManagementPage.jsx"));
const Members = lazy(() => import("../pages/librarian/MembersPage.jsx"));
const LibrarianCatalog = lazy(() => import("../pages/librarian/CatalogPage.jsx"));
const Circulation = lazy(() => import("../pages/librarian/CirculationPage.jsx"));
// admin
const AdminDashboard = lazy(() => import("../pages/admin/DashboardPage.jsx"));
const UserManagement = lazy(() => import("../pages/admin/UserManagementPage.jsx"));
const BorrowRecords = lazy(() => import("../pages/admin/BorrowRecordsPage.jsx"));
const Reports = lazy(() => import("../pages/admin/ReportsPage.jsx"));
const SystemHealth = lazy(() => import("../pages/admin/SystemHealthPage.jsx"));
// shared
const SettingsPage = lazy(() => import("../pages/shared/SettingsPage.jsx"));
const ProfilePage = lazy(() => import("../pages/shared/ProfilePage.jsx"));
const OverdueLoansPage = lazy(() => import("../pages/shared/OverdueLoansPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/shared/NotFoundPage.jsx"));

const Fallback = () => <div className="state"><div className="state__spinner" />Loading…</div>;

// Librarian uses the admin shell with its own nav.
const LibrarianShell = () => <AdminLayout role={ROLES.LIBRARIAN} />;
const AdminShell = () => <AdminLayout role={ROLES.ADMIN} />;

export default function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        {/* Public */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Student */}
        <Route element={<ProtectedRoute><RoleRoute allow={[ROLES.STUDENT]}><StudentLayout /></RoleRoute></ProtectedRoute>}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/search" element={<SearchBooks />} />
          <Route path="/student/catalog/:bookId" element={<BookDetail />} />
          <Route path="/student/borrowings" element={<MyBorrowings />} />
        </Route>

        {/* Librarian */}
        <Route element={<ProtectedRoute><RoleRoute allow={[ROLES.LIBRARIAN]}><LibrarianShell /></RoleRoute></ProtectedRoute>}>
          <Route path="/librarian/dashboard" element={<LibrarianDashboard />} />
          <Route path="/librarian/circulation" element={<Circulation />} />
          <Route path="/librarian/catalog" element={<LibrarianCatalog />} />
          <Route path="/librarian/books/new" element={<AddBook />} />
          <Route path="/librarian/activity" element={<BorrowingActivity />} />
          <Route path="/librarian/overdue" element={<OverdueManagement />} />
          <Route path="/librarian/overdue-loans" element={<OverdueLoansPage />} />
          <Route path="/librarian/members" element={<Members />} />
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute><RoleRoute allow={[ROLES.ADMIN]}><AdminShell /></RoleRoute></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/borrow-records" element={<BorrowRecords />} />
          <Route path="/admin/overdue-loans" element={<OverdueLoansPage />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/system" element={<SystemHealth />} />
        </Route>

        {/* Any signed-in role — RoleLayout picks the matching portal shell,
            so these never render inside the wrong sidebar. */}
        <Route element={<ProtectedRoute><RoleLayout /></ProtectedRoute>}>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
