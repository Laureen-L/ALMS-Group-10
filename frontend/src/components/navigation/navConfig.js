// Sidebar link lists per role. Sidebar reads from here — add a screen, add a line.
//
// The two staff lists are ordered by how the day actually runs rather than by
// how the code is organised: what needs doing now at the top, the catalog in
// the middle, people and analysis below.
import {
  LayoutDashboard, Search, BookMarked, User, Settings,
  Users, ClipboardList, BookOpen, AlertTriangle, BarChart3, PlusSquare, FolderOpen,
  ArrowLeftRight, CalendarClock, Boxes, Coins, ShieldCheck, SlidersHorizontal,
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
    // The two halves of chasing loans: overdue is reactive, due-soon prevents
    // the next batch of overdue ones.
    { to: "/librarian/overdue",     label: "Overdue Loans",      icon: AlertTriangle, badgeKey: "overdue" },
    { to: "/librarian/due-soon",    label: "Due Soon",           icon: CalendarClock },
    { to: "/librarian/fines",       label: "Fines",              icon: Coins },
    { to: "/librarian/catalog",     label: "Catalog",            icon: BookOpen },
    { to: "/librarian/books/new",   label: "Add New Book",       icon: PlusSquare },
    { to: "/librarian/inventory",   label: "Inventory",          icon: Boxes },
    { to: "/librarian/members",     label: "Members",            icon: Users },
    { to: "/librarian/activity",    label: "Borrowing Activity", icon: ClipboardList },
    { to: "/librarian/reports",     label: "Collection Insights", icon: BarChart3 },
    { to: "/profile",               label: "Profile",            icon: User },
  ],
  admin: [
    { to: "/admin/dashboard",      label: "Dashboard",       icon: LayoutDashboard },
    { to: "/admin/users",          label: "User Management", icon: Users },
    { to: "/admin/catalog",        label: "Catalog",         icon: BookOpen },
    { to: "/admin/borrow-records", label: "Borrow Records",  icon: ClipboardList },
    // Was reachable only by clicking a dashboard stat card.
    { to: "/admin/overdue",        label: "Overdue Loans",   icon: AlertTriangle, badgeKey: "overdue" },
    { to: "/admin/fines",          label: "Fines",           icon: Coins },
    { to: "/admin/reports",        label: "Reports",         icon: BarChart3 },
    // The two screens that make an administrator more than a senior librarian.
    { to: "/admin/audit",          label: "Audit Log",       icon: ShieldCheck },
    { to: "/admin/settings",       label: "Library Policy",  icon: SlidersHorizontal },
    { to: "/profile",              label: "Profile",         icon: User },
  ],
};

export const BRAND = {
  student:   { title: "Student Portal", sub: "Student Services" },
  librarian: { title: "Librarian Portal",   sub: "Library Management" },
  admin:     { title: "Admin Portal",   sub: "Library Management" },
};

export { Settings, FolderOpen };
