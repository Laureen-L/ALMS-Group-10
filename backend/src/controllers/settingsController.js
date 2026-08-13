const supabase = require('../config/supabaseClient');
const { logAudit, AUDIT_ACTIONS, ENTITY_TYPES } = require('../utils/audit');

/*
 * Library policy.
 * Requires the `system_settings` table (prisma/migrations/20260813140000_governance).
 *
 * The loan period and the borrow limit were `const` declarations in
 * borrowController.js, so changing library policy meant editing source and
 * redeploying. They live in one singleton row here instead, and an
 * administrator edits them from the Settings screen.
 *
 * Everything reads policy through getSettings(), which falls back to the
 * defaults below if the table is missing. That fallback is what lets this ship
 * before the migration has been run against a given database — borrowing keeps
 * working on the old hard-coded numbers rather than 500ing.
 */

/** The values the code used before policy was configurable. */
const DEFAULTS = Object.freeze({
  loan_period_days: 14,
  max_active_borrows: 5,
  max_renewals: 2,
  renewal_period_days: 7,
  fine_per_day: 0.5,
  fine_grace_days: 0,
  due_soon_days: 3,
  low_stock_threshold: 2,
});

/** Editable by an administrator. `id`, `updated_by` and `updated_at` are not. */
const EDITABLE_FIELDS = Object.keys(DEFAULTS);

/**
 * Bounds mirroring the CHECK constraints in the migration. Enforced here as
 * well so the client gets a sentence it can show a user, rather than the
 * opaque 400 Postgres returns for a constraint violation.
 */
const LIMITS = Object.freeze({
  loan_period_days: { min: 1, max: 365, label: 'Loan period' },
  max_active_borrows: { min: 1, max: 100, label: 'Borrow limit' },
  max_renewals: { min: 0, max: 20, label: 'Renewals allowed' },
  renewal_period_days: { min: 1, max: 365, label: 'Renewal period' },
  fine_per_day: { min: 0, max: 10000, label: 'Fine per day', decimal: true },
  fine_grace_days: { min: 0, max: 365, label: 'Grace period' },
  due_soon_days: { min: 1, max: 60, label: 'Due-soon window' },
  low_stock_threshold: { min: 0, max: 1000, label: 'Low-stock threshold' },
});

/** Postgres: relation does not exist. Raised when the migration hasn't run. */
const UNDEFINED_TABLE = '42P01';

/**
 * Current policy, with defaults filled in for anything missing.
 *
 * Called by borrowController and the fines logic on every transaction, so it
 * never throws: a policy read that fails must not stop a member borrowing a
 * book. Returns DEFAULTS on any error, which is the behaviour the system had
 * before this table existed.
 */
const getSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      if (error.code === UNDEFINED_TABLE) {
        console.warn(
          'getSettings: system_settings table not found — using built-in defaults. ' +
          'Run prisma/migrations/20260813140000_governance to make policy editable.'
        );
      } else {
        console.warn('getSettings: falling back to defaults —', error.message);
      }
      return { ...DEFAULTS };
    }

    if (!data) return { ...DEFAULTS };

    // NUMERIC comes back from PostgREST as a string; every caller does
    // arithmetic with it, so it is converted once here rather than at each
    // call site (where one missed Number() would silently concatenate).
    return {
      ...DEFAULTS,
      ...data,
      fine_per_day: Number(data.fine_per_day ?? DEFAULTS.fine_per_day),
    };
  } catch (err) {
    console.warn('getSettings: falling back to defaults —', err.message);
    return { ...DEFAULTS };
  }
};

/**
 * GET /api/admin/settings
 * Staff, not admin-only: the circulation desk shows the borrow limit and loan
 * period to librarians, and the fines desk needs the daily rate. Writing is
 * admin-only (see adminRoutes).
 */
const getSystemSettings = async (req, res) => {
  try {
    const settings = await getSettings();

    // Tell the client whether it is looking at stored policy or the built-in
    // fallback, so the Settings screen can say the migration is outstanding
    // instead of silently accepting edits that will not persist.
    const { error } = await supabase.from('system_settings').select('id').eq('id', 1).maybeSingle();

    return res.status(200).json({ ...settings, persisted: !error });
  } catch (err) {
    console.error('getSystemSettings error:', err);
    return res.status(500).json({ error: 'Failed to load library policy' });
  }
};

/**
 * PUT /api/admin/settings
 * Admin only. Body may carry any subset of EDITABLE_FIELDS.
 */
const updateSystemSettings = async (req, res) => {
  try {
    const patch = {};

    for (const field of EDITABLE_FIELDS) {
      if (req.body?.[field] === undefined) continue;

      const limit = LIMITS[field];
      const value = Number(req.body[field]);

      if (Number.isNaN(value)) {
        return res.status(400).json({ error: `${limit.label} must be a number.` });
      }
      if (!limit.decimal && !Number.isInteger(value)) {
        return res.status(400).json({ error: `${limit.label} must be a whole number.` });
      }
      if (value < limit.min || value > limit.max) {
        return res.status(400).json({
          error: `${limit.label} must be between ${limit.min} and ${limit.max}.`,
        });
      }

      patch[field] = value;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    // Read first, so the audit entry can record what actually changed rather
    // than just the new values. "Loan period 14 → 21" is the useful line.
    const before = await getSettings();

    const { data, error } = await supabase
      .from('system_settings')
      .update({ ...patch, updated_by: req.user.id, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === UNDEFINED_TABLE) {
        return res.status(503).json({
          error: 'Library policy storage is not set up yet. Run the governance migration first.',
        });
      }
      return res.status(400).json({ error: error.message });
    }
    if (!data) {
      return res.status(503).json({
        error: 'Library policy storage is not set up yet. Run the governance migration first.',
      });
    }

    // Only the fields that actually moved, so the log isn't full of no-ops.
    const changes = {};
    for (const [field, value] of Object.entries(patch)) {
      if (Number(before[field]) !== value) changes[field] = { from: before[field], to: value };
    }

    if (Object.keys(changes).length > 0) {
      await logAudit(req, {
        action: AUDIT_ACTIONS.SETTINGS_UPDATED,
        entityType: ENTITY_TYPES.SETTINGS,
        entityLabel: 'Library policy',
        details: changes,
      });
    }

    return res.status(200).json({
      success: true,
      settings: { ...data, fine_per_day: Number(data.fine_per_day), persisted: true },
      changed: Object.keys(changes),
    });
  } catch (err) {
    console.error('updateSystemSettings error:', err);
    return res.status(500).json({ error: 'Failed to update library policy' });
  }
};

module.exports = { getSettings, getSystemSettings, updateSystemSettings, DEFAULTS };
