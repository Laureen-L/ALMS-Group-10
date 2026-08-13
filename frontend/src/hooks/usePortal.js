// Which staff portal the signed-in user is in, and what they may do in it.
//
// Several screens are now shared between the librarian and admin portals —
// borrow records, overdue loans, the catalog, member detail, fines. They are
// one component each rather than two near-identical copies, so this is how a
// shared screen builds a link that stays inside the portal it is rendered in,
// and how it decides whether to offer an admin-only control.
//
// The permission flags mirror the role guards in the backend routes. They
// decide what to *show*; the server still decides what is allowed. A flag
// flipped in the browser gets a 403, not a deleted book.
import { useAuth } from "../context/AuthContext.jsx";
import { ROLES } from "../constants/roles.js";

export function usePortal() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === ROLES.ADMIN;

  return {
    role,
    isAdmin,
    isLibrarian: role === ROLES.LIBRARIAN,
    // Route prefix for the portal this screen is rendered in. A shared page
    // linking to "/librarian/members/1" from the admin portal would bounce off
    // the role guard, so links are always built from this.
    base: isAdmin ? "/admin" : "/librarian",

    // ---- Permissions, matching backend/src/routes ----

    /** DELETE /books/:id — destroys a catalogue row. Librarians withdraw instead. */
    canDeleteBooks: isAdmin,
    /** PUT /admin/members/:id/role — promote, demote, deactivate. */
    canManageMembers: isAdmin,
    /** PUT /fines/:id/waive — cancelling a debt is policy, not desk work. */
    canWaiveFines: isAdmin,
    /** PUT /admin/settings — library policy. */
    canEditPolicy: isAdmin,
    /** GET /admin/audit. */
    canViewAudit: isAdmin,
  };
}
