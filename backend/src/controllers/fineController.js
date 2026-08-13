const supabase = require('../config/supabaseClient');
const { getSettings } = require('./settingsController');
const { logAudit, AUDIT_ACTIONS, ENTITY_TYPES } = require('../utils/audit');
const { createNotification } = require('./notificationController');

/*
 * Fines for late returns.
 *
 * The `fines` table has existed since the initial migration and, until now,
 * nothing in the codebase ever wrote to it or read from it — the schema
 * described a feature that did not exist. This controller is that feature.
 *
 * A fine is issued automatically when a book comes back late (called from
 * borrowController.returnBook). Staff then mark it paid or waived; nothing
 * here takes a payment, which stays out of scope per SRS §6.
 *
 * fines.borrow_id is UNIQUE, so one loan can never carry two fines. That
 * constraint — not a check in this file — is what makes issuing idempotent.
 */

const DAY_MS = 1000 * 60 * 60 * 24;

/** Postgres unique-violation, raised by the UNIQUE on fines.borrow_id. */
const UNIQUE_VIOLATION = '23505';
/** Postgres: relation does not exist. */
const UNDEFINED_TABLE = '42P01';

const VALID_STATUSES = ['unpaid', 'paid', 'waived'];

/**
 * Whole days between two YYYY-MM-DD dates, floor at 0.
 *
 * The null check is not redundant with the NaN check below it: `new Date(null)`
 * is 1970-01-01, a perfectly valid date, not Invalid Date. Without this, a
 * missing due_date would be measured from the epoch and bill the member for
 * about twenty thousand days. This function decides what someone is charged,
 * so it refuses to guess at a missing input.
 */
const daysLate = (dueDate, returnDate) => {
  if (!dueDate || !returnDate) return 0;

  const due = new Date(dueDate);
  const back = new Date(returnDate);
  if (Number.isNaN(due.getTime()) || Number.isNaN(back.getTime())) return 0;

  return Math.max(0, Math.floor((back - due) / DAY_MS));
};

/**
 * Issue a fine for a loan returned late. Called by returnBook, not mounted as
 * a route.
 *
 * Returns { issued, amount, days, reason } and never throws: the book has
 * already been handed back and the loan is already closed by the time this
 * runs. A failure to write the fine must not turn a successful return into a
 * 500 — the member would be told their return failed while holding no book.
 */
const issueFineForLoan = async (loan, { title } = {}) => {
  try {
    const settings = await getSettings();

    if (!settings.fine_per_day || settings.fine_per_day <= 0) {
      return { issued: false, reason: 'Fines are disabled (rate is 0)' };
    }

    const late = daysLate(loan.due_date, loan.return_date);
    const chargeable = late - (settings.fine_grace_days || 0);

    if (chargeable <= 0) {
      return { issued: false, days: late, reason: late > 0 ? 'Within grace period' : 'Returned on time' };
    }

    const amount = Number((chargeable * settings.fine_per_day).toFixed(2));

    const { data, error } = await supabase
      .from('fines')
      .insert({
        borrow_id: loan.id,
        user_id: loan.user_id,
        amount,
        status: 'unpaid',
        notes:
          `${chargeable} day(s) late at GHS ${settings.fine_per_day.toFixed(2)}/day` +
          (settings.fine_grace_days ? ` (${settings.fine_grace_days} day grace applied)` : ''),
      })
      .select('id, amount')
      .maybeSingle();

    if (error) {
      // Already fined. Returning a book twice is not possible, but a retried
      // request is — and the constraint doing this job means no read-then-write
      // race can produce two fines for one loan.
      if (error.code === UNIQUE_VIOLATION) {
        return { issued: false, reason: 'A fine was already issued for this loan' };
      }
      if (error.code === UNDEFINED_TABLE) {
        return { issued: false, reason: 'Fines table not available' };
      }
      console.warn('issueFineForLoan:', error.message);
      return { issued: false, reason: error.message };
    }

    // Tell the member. Without this the first they hear of a fine is when
    // someone at the desk mentions it.
    await createNotification({
      userId: loan.user_id,
      title: 'Late return fine',
      body:
        `A fine of GHS ${amount.toFixed(2)} was added to your account for returning ` +
        `"${title || 'a library book'}" ${chargeable} day(s) late.`,
      type: 'fine_issued',
    });

    return { issued: true, fineId: data?.id, amount, days: chargeable };
  } catch (err) {
    console.warn('issueFineForLoan:', err.message);
    return { issued: false, reason: err.message };
  }
};

/**
 * GET /api/fines
 * Staff. Query: ?status=unpaid|paid|waived, ?userId=<uuid>
 */
const getFines = async (req, res) => {
  try {
    const { status, userId } = req.query;

    let query = supabase
      .from('fines')
      .select(
        'id, amount, status, issued_at, notes, borrow_id, user_id, ' +
        'users!fines_user_id_fkey(full_name, email), ' +
        'borrow_records(due_date, return_date, books(title, author, isbn))'
      )
      .order('issued_at', { ascending: false });

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      query = query.eq('status', status);
    }
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;

    if (error) {
      if (error.code === UNDEFINED_TABLE) return res.status(200).json({ fines: [], totals: {} });
      return res.status(400).json({ error: error.message });
    }

    const fines = data || [];

    // Summed here rather than in a second round trip: the fines desk shows
    // outstanding and collected totals above the table on every load.
    const totals = fines.reduce(
      (acc, f) => {
        const amount = Number(f.amount) || 0;
        acc[f.status] = Number(((acc[f.status] || 0) + amount).toFixed(2));
        return acc;
      },
      { unpaid: 0, paid: 0, waived: 0 }
    );

    return res.status(200).json({ fines, totals, count: fines.length });
  } catch (err) {
    console.error('getFines error:', err);
    return res.status(500).json({ error: 'Failed to fetch fines' });
  }
};

/**
 * GET /api/fines/mine
 * The signed-in member's own fines. Scoped to the token holder, so there is no
 * :id that could be swapped for someone else's.
 */
const getMyFines = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fines')
      .select('id, amount, status, issued_at, notes, borrow_records(due_date, return_date, books(title, author))')
      .eq('user_id', req.user.id)
      .order('issued_at', { ascending: false });

    if (error) {
      if (error.code === UNDEFINED_TABLE) return res.status(200).json({ fines: [], outstanding: 0 });
      return res.status(400).json({ error: error.message });
    }

    const fines = data || [];
    const outstanding = Number(
      fines
        .filter((f) => f.status === 'unpaid')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
        .toFixed(2)
    );

    return res.status(200).json({ fines, outstanding });
  } catch (err) {
    console.error('getMyFines error:', err);
    return res.status(500).json({ error: 'Failed to fetch your fines' });
  }
};

/**
 * Shared by the pay and waive routes — they differ only in the status they
 * set, who may call them (enforced on the route), and the audit action.
 */
const settleFine = (newStatus, auditAction) => async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};

    const { data: existing, error: readError } = await supabase
      .from('fines')
      .select('id, amount, status, user_id, users!fines_user_id_fkey(full_name)')
      .eq('id', id)
      .maybeSingle();

    if (readError) return res.status(400).json({ error: readError.message });
    if (!existing) return res.status(404).json({ error: 'Fine not found' });

    if (existing.status !== 'unpaid') {
      return res.status(400).json({ error: `This fine is already ${existing.status}.` });
    }

    const { data, error } = await supabase
      .from('fines')
      .update({
        status: newStatus,
        // Appended, not replaced: the original "N days late at X/day" note is
        // the evidence for the charge and should survive being settled.
        notes: notes ? `${existing.notes || ''}\n${req.user.email}: ${notes}`.trim() : existing.notes,
      })
      .eq('id', id)
      .select('id, amount, status, notes')
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });

    await logAudit(req, {
      action: auditAction,
      entityType: ENTITY_TYPES.FINE,
      entityId: id,
      entityLabel: `GHS ${Number(existing.amount).toFixed(2)} — ${existing.users?.full_name || 'member'}`,
      details: { amount: Number(existing.amount), from: 'unpaid', to: newStatus, notes: notes || null },
    });

    await createNotification({
      userId: existing.user_id,
      title: newStatus === 'paid' ? 'Fine paid' : 'Fine waived',
      body:
        newStatus === 'paid'
          ? `Your fine of GHS ${Number(existing.amount).toFixed(2)} has been recorded as paid. Thank you.`
          : `Your fine of GHS ${Number(existing.amount).toFixed(2)} has been waived by library staff.`,
      type: 'fine_settled',
    });

    return res.status(200).json({ success: true, fine: data });
  } catch (err) {
    console.error(`settleFine(${newStatus}) error:`, err);
    return res.status(500).json({ error: 'Failed to update the fine' });
  }
};

/** PUT /api/fines/:id/pay — librarian at the desk records a payment. */
const payFine = settleFine('paid', AUDIT_ACTIONS.FINE_PAID);

/**
 * PUT /api/fines/:id/waive — admin only.
 * Waiving cancels a debt outright, which is a policy decision rather than a
 * desk transaction, so librarians take payment but cannot write one off.
 */
const waiveFine = settleFine('waived', AUDIT_ACTIONS.FINE_WAIVED);

module.exports = { issueFineForLoan, getFines, getMyFines, payFine, waiveFine };
