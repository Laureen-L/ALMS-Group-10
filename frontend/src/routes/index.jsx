// Route tree. Pages are lazy-loaded so each screen ships its own chunk.
//
// The two staff portals mount most of the same screens at their own prefix.
// That is deliberate: a shared page reads usePortal() to know which portal it
// is in and what the signed-in role may do there, so there is one Catalog, one
// Members list and one Overdue screen rather than a librarian copy and an
// admin copy drifting apart. The RoleRoute guard still gates each prefix, and
// the backend still enforces every permission independently.
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

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
const StudentBookDetail = lazy(() => import("../pages/student/BookDetailPage.jsx"));
const MyBorrowings = lazy(() => import("../pages/student/MyBorrowingsPage.jsx"));
// librarian
const LibrarianDashboard = lazy(() => import("../pages/librarian/DashboardPage.jsx"));
const AddBook = lazy(() => import("../pages/librarian/AddBookPage.jsx"));
const Circulation = lazy(() => import("../pages/librarian/CirculationPage.jsx"));
// admin
const AdminDashboard = lazy(() => import("../pages/admin/DashboardPage.jsx"));
const AuditLog = lazy(() => import("../pages/admin/AuditLogPage.jsx"));
const SystemSettings = lazy(() => import("../pages/admin/SystemSettingsPage.jsx"));
// staff — one component, mounted under both portals
const Reports = lazy(() => import("../pages/admin/ReportsPage.jsx"));
const StaffCatalog = lazy(() => import("../pages/shared/CatalogPage.jsx"));
const StaffBookDetail = lazy(() => import("../pages/shared/BookDetailPage.jsx"));
const ImportBooks = lazy(() => import("../pages/shared/ImportBooksPage.jsx"));
const MembersPage = lazy(() => import("../pages/shared/MembersPage.jsx"));
const MemberDetail = lazy(() => import("../pages/shared/MemberDetailPage.jsx"));
const BorrowRecords = lazy(() => import("../pages/shared/BorrowRecordsPage.jsx"));
const OverdueLoansPage = lazy(() => import("../pages/shared/OverdueLoansPage.jsx"));
const DueSoonPage = lazy(() => import("../pages/shared/DueSoonPage.jsx"));
const InventoryPage = lazy(() => import("../pages/shared/InventoryPage.jsx"));
const FinesPage = lazy(() => import("../pages/shared/FinesPage.jsx"));
// shared, every role
const SettingsPage = lazy(() => import("../pages/shared/SettingsPage.jsx"));
const ProfilePage = lazy(() => import("../pages/shared/ProfilePage.jsx"));
const NotificationsPage = lazy(() => import("../pages/shared/NotificationsPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/shared/NotFoundPage.jsx"));

const Fallback = () => <div className="state"><div className="state__spinner" />Loading…</div>;

// Librarian uses the admin shell with its own nav.
const LibrarianShell = () => <AdminLayout role={ROLES.LIBRARIAN} />;
const AdminShell = () => <AdminLayout role={ROLES.ADMIN} />;

/**
 * The screens both staff portals mount, at whatever prefix wraps them.
 *
 * Rendered as a fragment inside each portal's guarded <Route>, so the two
 * trees cannot drift: adding a staff screen here adds it to both.
 */
const staffRoutes = (
  <>
    <Route path="catalog" element={<StaffCatalog />} />
    <Route path="catalog/:bookId" element={<StaffBookDetail />} />
    <Route path="books/new" element={<AddBook />} />
    <Route path="books/import" element={<ImportBooks />} />
    <Route path="members" element={<MembersPage />} />
    <Route path="members/:memberId" element={<MemberDetail />} />
    <Route path="overdue" element={<OverdueLoansPage />} />
    <Route path="due-soon" element={<DueSoonPage />} />
    <Route path="fines" element={<FinesPage />} />
  </>
);

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
          <Route path="/student/catalog/:bookId" element={<StudentBookDetail />} />
          <Route path="/student/borrowings" element={<MyBorrowings />} />
        </Route>

        {/* Librarian */}
        <Route path="/librarian" element={<ProtectedRoute><RoleRoute allow={[ROLES.LIBRARIAN]}><LibrarianShell /></RoleRoute></ProtectedRoute>}>
          <Route index element={<Navigate to="/librarian/dashboard" replace />} />
          <Route path="dashboard" element={<LibrarianDashboard />} />
          <Route path="circulation" element={<Circulation />} />
          {/* The librarian portal called this "Borrowing Activity" and the
              admin one "Borrow Records". Same screen; each keeps its path. */}
          <Route path="activity" element={<BorrowRecords />} />
          {staffRoutes}
          {/* Old links. The dashboard stat card pointed at /overdue-loans while
              the sidebar pointed at /overdue, and they were different screens. */}
          <Route path="overdue-loans" element={<Navigate to="/librarian/overdue" replace />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute><RoleRoute allow={[ROLES.ADMIN]}><AdminShell /></RoleRoute></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          {/* The admin sidebar has always called this "User Management". It is
              the same list the librarian portal mounts at /members, which is
              also live here so shared screens can link to member detail. */}
          <Route path="users" element={<MembersPage />} />
          <Route path="borrow-records" element={<BorrowRecords />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="settings" element={<SystemSettings />} />
          {staffRoutes}
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="overdue-loans" element={<Navigate to="/admin/overdue" replace />} />
        </Route>

        {/* Any signed-in role — RoleLayout picks the matching portal shell,
            so these never render inside the wrong sidebar. */}
        <Route element={<ProtectedRoute><RoleLayout /></ProtectedRoute>}>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
