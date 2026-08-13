// TopBar — search + signed-in user + logout. Used by both portal layouts.
// Below 900px it also carries the hamburger, since the sidebar is off-canvas
// there and this is the only way back to it.
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import Avatar from "../ui/Avatar.jsx";

// Where a search from the topbar lands, per role.
const SEARCH_TARGET = {
  student: "/student/search",
  librarian: "/librarian/catalog",
  admin: "/admin/borrow-records",
};

export default function TopBar({ searchPlaceholder = "Search catalog…", onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 250);
  // Only start navigating once the user has actually typed — otherwise the
  // first render would bounce every page to the search screen.
  const hasTyped = useRef(false);
  // The query we last sent to the router. useNavigate() hands back a new
  // function on every route change, which re-runs the effect below; without
  // this, leaving the results page would immediately navigate straight back
  // to them and swallow the page the user actually asked for.
  const lastSent = useRef(null);

  const target = SEARCH_TARGET[user?.role] || "/student/search";

  // Navigating anywhere but the results page ends the search, so the box
  // doesn't hold a stale query the user has already moved on from.
  useEffect(() => {
    if (pathname === target) return;
    hasTyped.current = false;
    lastSent.current = null;
    setQuery("");
  }, [pathname, target]);

  // Search as you type. Each settled keystroke replaces the current history
  // entry, so results narrow live without burying the previous page under a
  // stack of one-character URLs.
  useEffect(() => {
    if (!hasTyped.current) return;
    const q = debounced.trim();
    if (lastSent.current === q) return; // a re-render, not a new keystroke
    lastSent.current = q;
    navigate(`${target}?search=${encodeURIComponent(q)}`, { replace: true });
  }, [debounced, target, navigate]);

  function onSearch(e) {
    e.preventDefault();
    hasTyped.current = true;
    lastSent.current = query.trim();
    navigate(`${target}?search=${encodeURIComponent(query.trim())}`, { replace: true });
  }

  return (
    <header className="topbar">
      {onMenu && (
        <button className="topbar__menu" aria-label="Open menu" onClick={onMenu}>
          <Menu size={22} />
        </button>
      )}

      <form className="topbar__search" onSubmit={onSearch} role="search">
        <Search size={18} />
        <input
          type="search"
          placeholder={searchPlaceholder}
          aria-label="Search"
          value={query}
          onChange={(e) => { hasTyped.current = true; setQuery(e.target.value); }}
        />
      </form>
      <div className="topbar__user">
        <div className="topbar__who">
          <div className="topbar__name">{user ? `Welcome, ${user.name}` : "Welcome"}</div>
          {/* Derived from the signed-in role — never hardcoded, so a librarian
              can't be shown "ADMIN ACCESS". */}
          <div className="topbar__role access-badge">
            {user?.role ? `${user.role.toUpperCase()} ACCESS` : ""}
          </div>
        </div>
        <Avatar src={user?.avatar} name={user?.name} size={40} />
        <button className="topbar__logout" aria-label="Log out" onClick={logout}><LogOut size={20} /></button>
      </div>
    </header>
  );
}
