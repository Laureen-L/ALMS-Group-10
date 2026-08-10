// Sidebar link lists per role. Sidebar reads from here — add a screen, add a line.
import {
  LayoutDashboard, Search, BookMarked, User, Settings,
  Users, ClipboardList, BookOpen, AlertTriangle, BarChart3, PlusSquare, FolderOpen,
  ArrowLeftRight,
} from "lucide-react";

export const NAV = {
  student: [
    { to: "/student/dashboard", label: "Dashboard",     icon: LayoutDashboard },
    { to: "/student/search",    label: "Browse Books",  icon: Search },
    // Active loans and history now live in one tabbed screen.
    { to: "/student/borrowings",label: "My Borrowings", icon: BookMarked },
    { to: "/profile",           label: "Profile",       icon: User },
  ],
  librarian: [
    { to: "/librarian/dashboard",   label: "Dashboard",          icon: LayoutDashboard },
    { to: "/librarian/circulation", label: "Circulation Desk",   icon: ArrowLeftRight },
    { to: "/librarian/catalog",     label: "Catalog",            icon: BookOpen },
    { to: "/librarian/books/new",   label: "Add New Book",       icon: PlusSquare },
    { to: "/librarian/activity",    label: "Borrowing Activity", icon: ClipboardList },
    { to: "/librarian/overdue",     label: "Overdue Loans",      icon: AlertTriangle, badgeKey: "overdue" },
    { to: "/librarian/members",     label: "Members",            icon: Users },
    { to: "/profile",               label: "Profile",            icon: User },
  ],
  admin: [
    { to: "/admin/dashboard",      label: "Dashboard",       icon: LayoutDashboard },
    { to: "/admin/users",          label: "User Management", icon: Users },
    { to: "/admin/borrow-records", label: "Borrow Records",  icon: ClipboardList },
    { to: "/admin/reports",        label: "Reports",         icon: BarChart3 },
    { to: "/profile",              label: "Profile",         icon: User },
  ],
};

export const BRAND = {
  student:   { title: "Student Portal", sub: "Student Services" },
  librarian: { title: "Librarian Portal",   sub: "Library Management" },
  admin:     { title: "Admin Portal",   sub: "Library Management" },
};

export { Settings, FolderOpen };
