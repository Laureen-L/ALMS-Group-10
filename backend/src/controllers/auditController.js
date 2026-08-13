const supabase = require('../config/supabaseClient');

/*
 * Reading the audit trail. Writing it lives in utils/audit.js, which every
 * controller that changes something calls.
 *
 * Admin only, and read-only by design: there is no update or delete handler
 * here and there should never be one. A log an administrator can edit is not
 * a log. A correction is a new entry describing the correction.
 */

/** Postgres: relation does not exist. Raised when the migration hasn't run. */
const UNDEFINED_TABLE = '42P01';

const MAX_LIMIT = 200;

/**
 * GET /api/admin/audit
 * Query: ?action= ?entityType= ?entityId= ?actorId= ?limit=
 *
 * Filtered server-side rather than in the browser because this table only
 * grows, and it is the one screen where "just fetch everything" stops working
 * first.
 */
const getAuditLog = async (req, res) => {
  try {
    const { action, entityType, entityId, actorId } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, MAX_LIMIT);

    let query = supabase
      .from('audit_log')
      .select('id, actor_id, actor_email, actor_role, action, entity_type, entity_id, entity_label, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (action) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    if (actorId) query = query.eq('actor_id', actorId);

    const { data, error } = await query;

    if (error) {
      // An empty log and a missing table look the same to the screen, and the
      // screen is more useful saying "nothing recorded yet" than erroring. The
      // flag lets it explain that the migration is outstanding.
      if (error.code === UNDEFINED_TABLE) {
        return res.status(200).json({ entries: [], available: false });
      }
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ entries: data || [], available: true });
  } catch (err) {
    console.error('getAuditLog error:', err);
    return res.status(500).json({ error: 'Failed to fetch the audit log' });
  }
};

module.exports = { getAuditLog };
