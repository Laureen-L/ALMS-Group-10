// Sends "/" to the right place: the user's dashboard, or login if signed out.
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const HOME = { student: "/student/dashboard", librarian: "/librarian/dashboard", admin: "/admin/dashboard" };

export default function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="state"><div className="state__spinner" />Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME[user.role] || "/login"} replace />;
}
