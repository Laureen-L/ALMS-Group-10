// AdminLayout — white sidebar + green topbar.
// Shared by admin and librarian; pass the role so the right nav loads.
import { useState, useEffect } from "react";
import PortalShell from "./PortalShell.jsx";
import { getOverdue } from "../services/adminService.js";

export default function AdminLayout({ role = "admin" }) {
  const [badges, setBadges] = useState({});

  // The overdue count on the sidebar link.
  //
  // navConfig has carried `badgeKey: "overdue"` since the sidebar was written,
  // but nothing ever passed a `badges` prop — so the badge silently never
  // rendered. Both staff portals now flag overdue loans, and this is what
  // makes the number real.
  //
  // Fetched once per shell mount rather than per navigation: the shell stays
  // mounted while you move between screens, so this is one request per visit
  // to the portal, not one per page.
  useEffect(() => {
    let cancelled = false;
    getOverdue()
      .then((rows) => {
        // Nothing overdue means no badge at all, not a grey zero.
        if (!cancelled && rows.length > 0) setBadges({ overdue: rows.length });
      })
      // A decoration on a nav link. If it fails, the link is still a link —
      // and the screen it leads to reports the error properly.
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return <PortalShell role={role} badges={badges} searchPlaceholder="Search books…" />;
}
