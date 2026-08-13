const supabase = require('../config/supabaseClient');

/*
 * Audit logging.
 * Requires the `audit_log` table (prisma/migrations/20260813140000_governance).
 *
 * Role promotions, deactivations and catalogue removals used to leave no trace
 * of who performed them — borrow_records.processed_by was the only actor
 * recorded anywhere in the system. This is what the admin audit screen reads.
 *
 * The actor is always taken from the verified token (req.user), never from the
 * request body, so an entry cannot be attributed to someone else.
 */

/**
 * Actions worth recording. Kept as a frozen object rather than loose strings
 * so a typo at a call site is a crash in development instead of an entry that
 * silently never matches a filter.
 */
const AUDIT_ACTIONS = Object.freeze({
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_DEACTIVATED: 'member.deactivated',
  MEMBER_REACTIVATED: 'member.reactivated',
  MEMBER_CREATED: 'member.created',
  BOOK_CREATED: 'book.created',
  BOOK_UPDATED: 'book.updated',
  BOOK_WITHDRAWN: 'book.withdrawn',
  BOOK_RESTORED: 'book.restored',
  BOOK_DELETED: 'book.deleted',
  BOOK_IMPORTED: 'book.imported',
  LOAN_RENEWED: 'loan.renewed',
  FINE_ISSUED: 'fine.issued',
  FINE_PAID: 'fine.paid',
  FINE_WAIVED: 'fine.waived',
  SETTINGS_UPDATED: 'settings.updated',
  REMINDERS_SENT: 'reminders.sent',
});

const ENTITY_TYPES = Object.freeze({
  USER: 'user',
  BOOK: 'book',
  LOAN: 'loan',
  FINE: 'fine',
  SETTINGS: 'settings',
});

/** audit_log.entity_label is VARCHAR(255); book titles reach exactly that. */
const LABEL_MAX = 255;

const truncate = (text, max) =>
  text == null ? null : String(text).length <= max ? String(text) : `${String(text).slice(0, max - 1)}…`;

/**
 * Write one audit entry.
 *
 * Deliberately never throws and never returns a failure the caller has to
 * handle. Auditing is a side effect of an action that has already succeeded —
 * if the log write fails, the role change still happened, and taking the
 * request down would be strictly worse than a gap in the log. Failures are
 * logged to the server console so they are still discoverable.
 *
 * @param {object} req  the Express request, for req.user (the actor)
 * @param {object} entry
 * @param {string} entry.action       one of AUDIT_ACTIONS
 * @param {string} entry.entityType   one of ENTITY_TYPES
 * @param {string} [entry.entityId]   uuid of the thing acted on
 * @param {string} [entry.entityLabel] human-readable name, captured now
 * @param {object} [entry.details]    before/after values, free-form
 */
const logAudit = async (req, { action, entityType, entityId = null, entityLabel = null, details = null }) => {
  try {
    const actor = req?.user || {};

    const { error } = await supabase.from('audit_log').insert({
      actor_id: actor.id || null,
      // Copied in rather than joined: actor_id is SET NULL on account deletion,
      // and an entry reading "someone changed a role" is worthless.
      actor_email: truncate(actor.email, 100),
      actor_role: truncate(actor.role, 20),
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: truncate(entityLabel, LABEL_MAX),
      details,
    });

    if (error) {
      console.warn(`logAudit: could not record "${action}" —`, error.message);
    }
  } catch (err) {
    console.warn(`logAudit: could not record "${action}" —`, err.message);
  }
};

module.exports = { logAudit, AUDIT_ACTIONS, ENTITY_TYPES };
