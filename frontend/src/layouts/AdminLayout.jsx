// AdminLayout — white sidebar + green topbar (Screens 4, 5, 8).
// Shared by admin and librarian; pass the role so the right nav loads.
import PortalShell from "./PortalShell.jsx";

export default function AdminLayout({ role = "admin", badges }) {
  return <PortalShell role={role} badges={badges} searchPlaceholder="Search catalog…" />;
}
