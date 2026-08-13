// PortalShell — the sidebar + topbar frame both portals sit in.
// It owns the mobile nav drawer state: below 900px the sidebar is off-canvas
// and the topbar's hamburger is the only way to it, so the open/closed flag has
// to live above both of them.
import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/navigation/Sidebar.jsx";
import TopBar from "../components/navigation/TopBar.jsx";

export default function PortalShell({ role, cream, badges, searchPlaceholder }) {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Following a link out of the drawer should leave the drawer behind.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  // Escape closes it, the same way it closes a modal.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className="shell">
      <Sidebar
        role={role}
        cream={cream}
        badges={badges}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      {navOpen && <div className="nav-overlay" onClick={() => setNavOpen(false)} />}
      <div className="shell__main">
        <TopBar searchPlaceholder={searchPlaceholder} onMenu={() => setNavOpen(true)} />
        <main className="shell__content"><Outlet /></main>
      </div>
    </div>
  );
}
