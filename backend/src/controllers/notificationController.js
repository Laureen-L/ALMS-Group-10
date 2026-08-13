const supabase = require('../config/supabaseClient');

/*
 * In-app notifications.
 * Requires the `notifications` table (prisma/migrations/20260813120000_notifications).
 *
 * This is the delivery channel that has no external dependency. Overdue
 * notices used to exist only as SMS, so an unset TERMII_API_KEY — or a sender
 * ID still waiting on approval — meant the member was never told anything at
 * all. A row in this table always reaches them.
 *
 * Every handler acts on the token holder (req.user.id) rather than an :id in
 * the path, so there is no way to address someone else's inbox.
 */

/** Postgres unique-violation. Raised by notifications_unread_per_loan_key. */
const UNIQUE_VIOLATION = '23505';

/**
 * Write a notification. Called by other controllers, not mounted as a route.
 *
 * Returns { created, duplicate, error } rather than throwing: the callers are
 * batch jobs where one member's notice failing must not abandon the rest of
 * the run.
 *
 * A duplicate is not a failure. The partial unique index rejects a second
 * unread notice for the same loan and kind, so a librarian who clicks "Send
 * reminders" twice doesn't give everyone two of everything — the second write
 * lands here and is reported as `duplicate`.
 */
const createNotification = async ({ userId, title, body, type = 'general', borrowId = null }) => {
  if (!userId || !title || !body) {
    return { created: false, duplicate: false, error: 'userId, title and body are required' };
  }

  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, title, body, type, borrow_id: borrowId });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { created: false, duplicate: true, error: null };
    }
    return { created: false, duplicate: false, error: error.message };
  }

  return { created: true, duplicate: false, error: null };
};

/**
 * GET /api/notifications
 * The signed-in member's inbox, newest first, plus the unread count the
 * topbar badge needs — saving the client a second round trip on every load.
 */
const getNotifications = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, type, borrow_id, read_at, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return res.status(400).json({ error: error.message });

    const notifications = data || [];

    return res.status(200).json({
      notifications,
      unreadCount: notifications.filter((n) => !n.read_at).length,
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Scoped by user_id as well as id, so a guessed UUID marks nothing.
 */
const markRead = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id')
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Notification not found' });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('markRead error:', err);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
};

/**
 * PUT /api/notifications/read-all
 * Already-read rows are excluded so their original read_at is preserved.
 */
const markAllRead = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .is('read_at', null)
      .select('id');

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ success: true, updated: (data || []).length });
  } catch (err) {
    console.error('markAllRead error:', err);
    return res.status(500).json({ error: 'Failed to update notifications' });
  }
};

module.exports = { createNotification, getNotifications, markRead, markAllRead };
