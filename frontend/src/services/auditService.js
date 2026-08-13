// The audit trail (GET /api/admin/audit). Admin only, read-only.
//
// Role promotions, deactivations and catalogue removals previously left no
// record of who performed them. This is the screen that answers "who did this".
import { api } from "./apiClient.js";
import { formatDate } from "../utils/formatDate.js";

const USE_MOCK = () => import.meta.env.VITE_USE_MOCK !== "false";

// Every action the backend records, with the wording the log shows and the
// tone its badge takes. Keys must match utils/audit.js on the backend.
export const AUDIT_ACTIONS = {
  "member.role_changed": { label: "Role changed", tone: "amber", group: "Members" },
  "member.deactivated": { label: "Account deactivated", tone: "red", group: "Members" },
  "member.reactivated": { label: "Account reactivated", tone: "green", group: "Members" },
  "member.created": { label: "Member invited", tone: "green", group: "Members" },
  "book.created": { label: "Book added", tone: "green", group: "Catalog" },
  "book.updated": { label: "Book edited", tone: "neutral", group: "Catalog" },
  "book.withdrawn": { label: "Book withdrawn", tone: "amber", group: "Catalog" },
  "book.restored": { label: "Book restored", tone: "green", group: "Catalog" },
  "book.deleted": { label: "Book deleted", tone: "red", group: "Catalog" },
  "book.imported": { label: "Books imported", tone: "green", group: "Catalog" },
  "loan.renewed": { label: "Loan renewed", tone: "neutral", group: "Circulation" },
  "fine.issued": { label: "Fine issued", tone: "amber", group: "Fines" },
  "fine.paid": { label: "Fine paid", tone: "green", group: "Fines" },
  "fine.waived": { label: "Fine waived", tone: "amber", group: "Fines" },
  "settings.updated": { label: "Policy changed", tone: "amber", group: "System" },
  "reminders.sent": { label: "Reminders sent", tone: "neutral", group: "Circulation" },
};

export function describeAction(action) {
  return AUDIT_ACTIONS[action] || { label: action, tone: "neutral", group: "Other" };
}

/**
 * Turn the details JSONB into one readable line.
 *
 * The shape differs per action by design — a role change carries from/to, an
 * import carries counts — so this handles the shapes worth phrasing specially
 * and falls back to key: value for the rest.
 */
export function summarizeDetails(entry) {
  const d = entry?.details;
  if (!d || typeof d !== "object") return "";

  if (entry.action === "member.role_changed" && d.from && d.to) {
    return `${d.from} → ${d.to}`;
  }
  if (entry.action === "settings.updated") {
    // details is { field: { from, to } } for each field that moved.
    return Object.entries(d)
      .map(([field, change]) => `${field.replace(/_/g, " ")}: ${change?.from} → ${change?.to}`)
      .join(", ");
  }
  if (entry.action === "loan.renewed") {
    return `due ${d.from} → ${d.to} (renewal ${d.renewalNumber} of ${d.of})`;
  }
  if (entry.action === "book.imported") {
    return `${d.imported} imported${d.failed ? `, ${d.failed} rejected` : ""}`;
  }
  if (entry.action === "book.updated" && d.changed) {
    return `fields: ${Object.keys(d.changed).join(", ")}`;
  }
  if (entry.action === "reminders.sent") {
    return `${d.notified} notified${d.smsSent ? `, ${d.smsSent} by SMS` : ""}`;
  }

  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

const MOCK_ENTRIES = [
  {
    id: "a1", actor_email: "admin@knust.edu.gh", actor_role: "admin",
    action: "member.role_changed", entity_type: "user", entity_label: "Ama Serwaa",
    details: { from: "student", to: "librarian" }, created_at: new Date(Date.now() - 2 * 36e5).toISOString(),
  },
  {
    id: "a2", actor_email: "librarian@knust.edu.gh", actor_role: "librarian",
    action: "book.withdrawn", entity_type: "book", entity_label: "Design Patterns",
    details: { author: "Erich Gamma", reason: "Damaged beyond repair" },
    created_at: new Date(Date.now() - 26 * 36e5).toISOString(),
  },
  {
    id: "a3", actor_email: "admin@knust.edu.gh", actor_role: "admin",
    action: "settings.updated", entity_type: "settings", entity_label: "Library policy",
    details: { loan_period_days: { from: 14, to: 21 } },
    created_at: new Date(Date.now() - 50 * 36e5).toISOString(),
  },
];

// GET /admin/audit?action=&entityType=&entityId=&actorId=&limit=
export async function getAuditLog({ action = "", entityType = "", entityId = "", actorId = "", limit = 100 } = {}) {
  if (USE_MOCK()) {
    const rows = MOCK_ENTRIES.filter(
      (e) => (!action || e.action === action) && (!entityType || e.entity_type === entityType)
    );
    return { entries: rows.map(mapEntry), available: true };
  }

  const params = new URLSearchParams();
  if (action) params.set("action", action);
  if (entityType) params.set("entityType", entityType);
  if (entityId) params.set("entityId", entityId);
  if (actorId) params.set("actorId", actorId);
  if (limit) params.set("limit", String(limit));

  const data = await api.get(`/admin/audit?${params.toString()}`);
  return {
    entries: (data.entries || []).map(mapEntry),
    // false means the audit_log table isn't there yet. The screen explains the
    // outstanding migration rather than showing a bare empty state.
    available: data.available !== false,
  };
}

function mapEntry(e) {
  const meta = describeAction(e.action);
  return {
    id: e.id,
    action: e.action,
    actionLabel: meta.label,
    tone: meta.tone,
    group: meta.group,
    actor: e.actor_email || "—",
    actorRole: e.actor_role || null,
    entityType: e.entity_type,
    entityId: e.entity_id,
    target: e.entity_label || "—",
    details: e.details,
    summary: summarizeDetails(e),
    when: formatDate(e.created_at),
    // Kept raw so the table can show a time as well as a date — several
    // entries a day is normal and "Aug 13, 2026" alone can't order them.
    whenRaw: e.created_at,
  };
}
