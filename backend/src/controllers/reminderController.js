const axios = require('axios');
const supabase = require('../config/supabaseClient');
const { normalizePhone } = require('../utils/phone');
const { createNotification } = require('./notificationController');
const { logAudit, AUDIT_ACTIONS, ENTITY_TYPES } = require('../utils/audit');

/*
 * Overdue reminders, over two channels.
 *
 * In-app notification is the primary one and always runs: it has no external
 * dependency, so every overdue member is told regardless of how SMS is set up.
 *
 * SMS via Termii is added on top when TERMII_API_KEY is present. Without the
 * key the endpoint still succeeds and still notifies — it just reports
 * smsConfigured: false. It used to return 503 and do nothing at all, which
 * left the whole feature dead behind a third-party signup and a sender ID
 * awaiting approval.
 *
 * `skipped` and `failed` therefore describe the SMS channel only:
 *   - skipped — no phone number on file. Not a failure; most members haven't
 *     set one, and they got the in-app notice regardless.
 *   - failed  — a number that is on file but unusable, or a Termii rejection.
 *     Worth showing the librarian, because the record needs fixing.
 */

const TERMII_URL = 'https://api.ng.termii.com/api/sms/send';
const SENDER_ID = 'ALMS-KNUST';
const DAY_MS = 1000 * 60 * 60 * 24;

/** notifications.title is VARCHAR(150) and book titles run to 255. */
const TITLE_MAX = 150;

const daysBetween = (from, to) => Math.floor((to - from) / DAY_MS);

const truncate = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

/**
 * POST /api/admin/send-overdue-reminders
 * Body: { loanId } — optional. Omit to remind everyone overdue; pass one to
 * remind a single member, which is what the per-row "Remind" button does.
 * Staff only.
 */
const sendOverdueReminders = async (req, res) => {
  // Read at request time, not module load, so adding the key to .env and
  // restarting is the whole deployment step — no code change, no rebuild.
  const apiKey = process.env.TERMII_API_KEY;
  const smsConfigured = Boolean(apiKey);

  try {
    const { loanId } = req.body || {};
    const today = new Date().toISOString().slice(0, 10);

    // 'overdue' is stamped by the nightly job, so also catch loans still
    // marked 'active' whose due date has already passed.
    let query = supabase
      .from('borrow_records')
      .select('id, due_date, status, users!borrow_records_user_id_fkey(id, full_name, phone), books(title)')
      .in('status', ['active', 'overdue'])
      .lt('due_date', today);

    if (loanId) query = query.eq('id', loanId);

    const { data: overdueLoans, error } = await query;

    if (error) throw error;

    if (loanId && (!overdueLoans || overdueLoans.length === 0)) {
      return res.status(404).json({ error: 'That loan is not overdue.' });
    }

    const results = {
      notified: 0,
      alreadyNotified: 0,
      sent: 0,
      skipped: [],
      failed: [],
      notifyFailed: [],
    };

    for (const loan of overdueLoans || []) {
      const member = loan.users;
      const title = loan.books?.title || 'a library book';

      // A loan with no readable member row can't be notified either way.
      if (!member?.id) {
        results.notifyFailed.push({ loanId: loan.id, reason: 'Loan has no member record' });
        continue;
      }

      const days = Math.max(1, daysBetween(new Date(loan.due_date), new Date()));
      const message =
        `Dear ${member.full_name}, your loan of "${title}" is ${days} day(s) overdue. ` +
        `Please return it promptly. — KNUST Library`;

      // ---- Channel 1: in-app. Always runs. ----
      const notice = await createNotification({
        userId: member.id,
        title: truncate(`Overdue: ${title}`, TITLE_MAX),
        body: message,
        type: 'overdue_reminder',
        borrowId: loan.id,
      });

      if (notice.created) results.notified += 1;
      else if (notice.duplicate) results.alreadyNotified += 1;
      else results.notifyFailed.push({ loanId: loan.id, reason: notice.error });

      // ---- Channel 2: SMS. Only when Termii is set up. ----
      if (!smsConfigured) continue;

      if (!member.phone) {
        results.skipped.push({ loanId: loan.id, reason: 'No phone number on file' });
        continue;
      }

      // Termii needs bare international digits; users.phone holds whatever the
      // member typed. An unreadable number would post fine and never arrive.
      const recipient = normalizePhone(member.phone);

      if (!recipient) {
        results.failed.push({
          loanId: loan.id,
          reason: `"${member.phone}" is not a usable phone number. Ask ${member.full_name} to correct it in their profile.`,
        });
        continue;
      }

      try {
        await axios.post(
          TERMII_URL,
          {
            to: recipient,
            from: SENDER_ID,
            sms: message,
            type: 'plain',
            api_key: apiKey,
            channel: 'generic',
          },
          { timeout: 15000 }
        );
        results.sent += 1;
      } catch (smsError) {
        // One bad number must not abort the whole run — and must not cost the
        // member their in-app notice, which is already written by this point.
        const detail = smsError.response?.data?.message || smsError.message;
        console.error(`SMS reminder failed for loan ${loan.id}:`, detail);
        results.failed.push({ loanId: loan.id, reason: detail });
      }
    }

    // Only the bulk run is recorded. A per-row "Remind" is routine desk work;
    // a broadcast reaches every overdue member at once and costs SMS credit,
    // which is worth being able to trace back to whoever triggered it.
    if (!loanId && (overdueLoans || []).length > 0) {
      await logAudit(req, {
        action: AUDIT_ACTIONS.REMINDERS_SENT,
        entityType: ENTITY_TYPES.LOAN,
        entityLabel: `${(overdueLoans || []).length} overdue loan(s)`,
        details: {
          notified: results.notified,
          alreadyNotified: results.alreadyNotified,
          smsSent: results.sent,
          smsConfigured,
          failed: results.failed.length,
        },
      });
    }

    return res.status(200).json({
      success: true,
      totalOverdue: (overdueLoans || []).length,
      notified: results.notified,
      alreadyNotified: results.alreadyNotified,
      remindersSent: results.sent,
      smsConfigured,
      skipped: results.skipped,
      failed: results.failed,
      notifyFailed: results.notifyFailed,
    });
  } catch (err) {
    console.error('sendOverdueReminders error:', err);
    return res.status(500).json({ error: 'Failed to send overdue reminders' });
  }
};

module.exports = { sendOverdueReminders };
