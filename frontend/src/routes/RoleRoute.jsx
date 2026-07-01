// RoleRoute — restricts to specific roles. Usage: <RoleRoute allow={["admin"]}>...
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RoleRoute({ allow = [], children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/404" replace />;
  return children;
}
