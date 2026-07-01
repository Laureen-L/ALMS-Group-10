// AuthLayout — split screen: branding panel (left) + form card (right) + footer.
// Matches Screen 3. Each auth page renders its form inside the card via <Outlet>.
import { Outlet } from "react-router-dom";
import { BookOpen } from "lucide-react";

export default function AuthLayout() {
  const year = new Date().getFullYear();
  return (
    <div className="auth">
      <div className="auth__body">
        <div className="auth__brand">
          <div>
            <span className="auth__logo"><BookOpen size={42} color="var(--green-700)" /></span>
            <h1 className="auth__brand-title">KNUST Library</h1>
            <p className="auth__brand-sub">Automated Library Management System</p>
          </div>
        </div>

        <div className="auth__panel">
          <div className="auth__card">
            <Outlet />
          </div>
        </div>
      </div>

      <footer className="auth__footer">
        KNUST Computer Science Department &copy; {year}
      </footer>
    </div>
  );
}