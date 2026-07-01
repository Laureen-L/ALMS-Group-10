// TopBar — search + signed-in user + logout. Used by both portal layouts.
import { Search, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Avatar from "../ui/Avatar.jsx";

const ROLE_LABEL = { student: "Student Access", librarian: "Admin Access", admin: "Library Superintendent" };

export default function TopBar({ searchPlaceholder = "Search catalog…" }) {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar__search">
        <Search size={18} />
        <input type="search" placeholder={searchPlaceholder} aria-label="Search" />
      </div>
      <div className="topbar__user">
        <div style={{ textAlign: "right" }}>
          <div className="topbar__name">{user ? `Welcome, ${user.name}` : "Welcome"}</div>
          <div className="topbar__role">{user ? (ROLE_LABEL[user.role] || user.role) : ""}</div>
        </div>
        <Avatar src={user?.avatar} name={user?.name} size={40} />
        <button className="topbar__logout" aria-label="Log out" onClick={logout}><LogOut size={20} /></button>
      </div>
    </header>
  );
}
