// AdminLayout — white sidebar + green topbar (Screens 4, 5, 8).
// Shared by admin and librarian; pass the role so the right nav loads.
import { Outlet } from "react-router-dom";
import Sidebar from "../components/navigation/Sidebar.jsx";
import TopBar from "../components/navigation/TopBar.jsx";

export default function AdminLayout({ role = "admin", badges }) {
  return (
    <div className="shell">
      <Sidebar role={role} badges={badges} />
      <div className="shell__main">
        <TopBar searchPlaceholder="Search catalog…" />
        <main className="shell__content"><Outlet /></main>
      </div>
    </div>
  );
}
