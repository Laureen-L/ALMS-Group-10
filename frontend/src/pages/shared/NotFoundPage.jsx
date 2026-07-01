// SCREEN 7 — 404 Not Found. Big numeral, return action, quick links.
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, ArrowLeft, Search, BookMarked, Headphones } from "lucide-react";
import Button from "../../components/ui/Button.jsx";

const QUICK = [
  { to: "/student/search", label: "Search Books", icon: Search },
  { to: "/student/borrowings", label: "My Borrowings", icon: BookMarked },
  { to: "/settings", label: "Contact Librarian", icon: Headphones },
];

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 120, color: "var(--green-500)", lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 32, marginTop: 8 }}>Page not found</h1>
        <p style={{ color: "var(--muted)", marginTop: 10 }}>
          That page doesn’t exist. It may have been moved or removed.
        </p>

        <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
          <Button variant="green" onClick={() => navigate("/student/dashboard")}>
            <LayoutDashboard size={18} /> Return to dashboard
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Go back
          </Button>
        </div>

        <div style={{ marginTop: 40 }}>
          <div className="field__label" style={{ marginBottom: 18 }}>Quick links</div>
          <div className="row" style={{ justifyContent: "center", gap: 40 }}>
            {QUICK.map((q) => {
              const Icon = q.icon;
              return (
                <Link key={q.to} to={q.to} style={{ display: "grid", justifyItems: "center", gap: 8, color: "var(--ink)" }}>
                  <span className="stat__icon"><Icon size={20} /></span>
                  <span style={{ fontSize: 13 }}>{q.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
