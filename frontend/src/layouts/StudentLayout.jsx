// StudentLayout — cream sidebar + green topbar (Screens 1, 2, 6).
import { Outlet } from "react-router-dom";
import Sidebar from "../components/navigation/Sidebar.jsx";
import TopBar from "../components/navigation/TopBar.jsx";
import { ROLES } from "../constants/roles.js";

export default function StudentLayout() {
  return (
    <div className="shell">
      <Sidebar role={ROLES.STUDENT} cream />
      <div className="shell__main">
        <TopBar />
        <main className="shell__content"><Outlet /></main>
      </div>
    </div>
  );
}
