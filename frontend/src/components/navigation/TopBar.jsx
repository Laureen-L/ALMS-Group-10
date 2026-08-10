// TopBar — search + signed-in user + logout. Used by both portal layouts.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Avatar from "../ui/Avatar.jsx";

// Where a search from the topbar lands, per role.
const SEARCH_TARGET = {
  student: "/student/search",
  librarian: "/librarian/catalog",
  admin: "/admin/borrow-records",
};

export default function TopBar({ searchPlaceholder = "Search catalog…" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function onSearch(e) {
    e.preventDefault();
    const target = SEARCH_TARGET[user?.role] || "/student/search";
    navigate(`${target}?search=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="topbar">
      <form className="topbar__search" onSubmit={onSearch} role="search">
        <Search size={18} />
        <input
          type="search"
          placeholder={searchPlaceholder}
          aria-label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      <div className="topbar__user">
        <div style={{ textAlign: "right" }}>
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
