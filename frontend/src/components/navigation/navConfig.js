// Sidebar link lists per role. Sidebar reads from here — add a screen, add a line.
import {
  LayoutDashboard, Search, BookMarked, History, User, Settings,
  Users, ClipboardList, BookOpen, AlertTriangle, BarChart3, PlusSquare, FolderOpen,
} from "lucide-react";

export const NAV = {
  student: [
    { to: "/student/dashboard", label: "Dashboard",         icon: LayoutDashboard },
    { to: "/student/search",    label: "Search Books",      icon: Search },
    { to: "/student/borrowings",label: "My Borrowings",     icon: BookMarked },
    { to: "/student/history",   label: "Borrowing History", icon: History },
    { to: "/student/profile",   label: "Profile",           icon: User },
  ],
  librarian: [
    { to: "/librarian/dashboard", label: "Dashboard",          icon: LayoutDashboard },
    { to: "/librarian/books/new", label: "Add New Book",       icon: PlusSquare },
    { to: "/librarian/activity",  label: "Borrowing Activity", icon: ClipboardList },
    { to: "/librarian/overdue",   label: "Overdue Loans",      icon: AlertTriangle, badgeKey: "overdue" },
    { to: "/librarian/members",   label: "Members",            icon: Users },
  ],
  admin: [
    { to: "/admin/dashboard",      label: "Dashboard",        icon: LayoutDashboard },
    { to: "/admin/users",          label: "User Management",  icon: Users },
    { to: "/admin/borrow-records", label: "Borrow Records",   icon: ClipboardList },
    { to: "/admin/catalog",        label: "Catalog",          icon: BookOpen },
    { to: "/admin/reports",        label: "Reports",          icon: BarChart3 },
  ],
};

export const BRAND = {
  student:   { title: "Library Portal", sub: "Student Services" },
  librarian: { title: "Librarian Portal",   sub: "Library Management" },
  admin:     { title: "Admin Portal",   sub: "Library Management" },
};

export { Settings, FolderOpen };
