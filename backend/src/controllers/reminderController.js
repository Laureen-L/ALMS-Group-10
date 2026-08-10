const axios = require('axios');
const supabase = require('../config/supabaseClient');

/*
 * Overdue SMS reminders via Termii.
 *
 * Requires TERMII_API_KEY in .env. Without it the endpoint returns 503 rather
 * than silently reporting success, so a misconfigured deploy is obvious.
 *
 * Members with no phone number on file are skipped and reported back in
 * `skipped`, not treated as failures — most members simply haven't set one.
 */

const TERMII_URL = 'https://api.ng.termii.com/api/sms/send';
const SENDER_ID = 'ALMS-KNUST';
const DAY_MS = 1000 * 60 * 60 * 24;

const daysBetween = (from, to) => Math.floor((to - from) / DAY_MS);

/**
 * POST /api/admin/send-overdue-reminders
 * Body: { loanId } — optional. Omit to text everyone overdue; pass one to
 * remind a single member, which is what the per-row "Remind" button does.
 * Staff only.
 */
const sendOverdueReminders = async (req, res) => {
  const apiKey = process.env.TERMII_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'SMS is not configured. Set TERMII_API_KEY in the backend .env file.',
    });
  }

  try {
    const { loanId } = req.body || {};
    const today = new Date().toISOString().slice(0, 10);

    // 'overdue' is stamped by the nightly job, so also catch loans still
    // marked 'active' whose due date has already passed.
    let query = supabase
      .from('borrow_records')
      .select('id, due_date, status, users!borrow_records_user_id_fkey(full_name, phone), books(title)')
      .in('status', ['active', 'overdue'])
      .lt('due_date', today);

    if (loanId) query = query.eq('id', loanId);

    const { data: overdueLoans, error } = await query;

    if (error) throw error;

    if (loanId && (!overdueLoans || overdueLoans.length === 0)) {
      return res.status(404).json({ error: 'That loan is not overdue.' });
    }

    const results = { sent: 0, skipped: [], failed: [] };

    for (const loan of overdueLoans || []) {
      const member = loan.users;
      const title = loan.books?.title || 'a library book';

      if (!member?.phone) {
        results.skipped.push({ loanId: loan.id, reason: 'No phone number on file' });
        continue;
      }

      const days = Math.max(1, daysBetween(new Date(loan.due_date), new Date()));
      const message =
        `Dear ${member.full_name}, your loan of "${title}" is ${days} day(s) overdue. ` +
        `Please return it promptly. — KNUST Library`;

      try {
        await axios.post(
          TERMII_URL,
          {
            to: member.phone,
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
        // One bad number must not abort the whole run.
        const detail = smsError.response?.data?.message || smsError.message;
        console.error(`Reminder failed for loan ${loan.id}:`, detail);
        results.failed.push({ loanId: loan.id, reason: detail });
      }
    }

    return res.status(200).json({
      success: true,
      totalOverdue: (overdueLoans || []).length,
      remindersSent: results.sent,
      skipped: results.skipped,
      failed: results.failed,
    });
  } catch (err) {
    console.error('sendOverdueReminders error:', err);
    return res.status(500).json({ error: 'Failed to send overdue reminders' });
  }
};

module.exports = { sendOverdueReminders };
