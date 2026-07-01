// Sidebar — config-driven. Pass the role; links come from navConfig.
// Highlights the active route automatically via NavLink.
import { NavLink } from "react-router-dom";
import { BookOpen, Settings, LogOut } from "lucide-react";
import { NAV, BRAND } from "./navConfig.js";
import { useAuth } from "../../context/AuthContext.jsx";
import Badge from "../ui/Badge.jsx";

export default function Sidebar({ role, cream, badges = {} }) {
  const { logout } = useAuth();
  const links = NAV[role] || [];
  const brand = BRAND[role] || { title: "Library", sub: "" };

  return (
    <aside className={["sidebar", cream && "sidebar--cream"].filter(Boolean).join(" ")}>
      <div className="sidebar__brand">
        <BookOpen size={22} color="var(--green-700)" />
        <div>
          <div className="sidebar__brand-title">{brand.title}</div>
          <div className="sidebar__brand-sub">{brand.sub}</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {links.map((link) => {
          const Icon = link.icon;
          const badgeVal = link.badgeKey ? badges[link.badgeKey] : null;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                ["sidebar__link", isActive && "sidebar__link--active"].filter(Boolean).join(" ")
              }
            >
              <Icon size={18} />
              <span>{link.label}</span>
              {badgeVal ? <span className="sidebar__badge"><Badge tone="red">{badgeVal}</Badge></span> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__spacer" />

      <div className="sidebar__footer">
        <NavLink to="/settings" className="sidebar__link"><Settings size={18} /><span>Settings</span></NavLink>
        <button className="sidebar__link sidebar__link--danger" onClick={logout} style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", width: "100%" }}>
          <LogOut size={18} /><span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
