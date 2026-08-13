// RoleLayout — renders the portal shell that matches the signed-in role.
// Used by routes that every role can reach (Settings, Profile), so an admin
// never lands on a shared page wearing the student sidebar.
import { ROLES } from "../constants/roles.js";
import StudentLayout from "../layouts/StudentLayout.jsx";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function RoleLayout() {
  const { user } = useAuth();

  if (user?.role === ROLES.ADMIN) return <AdminLayout role={ROLES.ADMIN} />;
  if (user?.role === ROLES.LIBRARIAN) return <AdminLayout role={ROLES.LIBRARIAN} />;
  return <StudentLayout />;
}
