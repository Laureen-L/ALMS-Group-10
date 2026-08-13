// StudentLayout — cream sidebar + green topbar (Screens 1, 2, 6).
import PortalShell from "./PortalShell.jsx";
import { ROLES } from "../constants/roles.js";

export default function StudentLayout() {
  return <PortalShell role={ROLES.STUDENT} cream />;
}
