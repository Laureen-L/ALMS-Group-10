const supabase = require('../config/supabaseClient');
const { getSettings } = require('./settingsController');
const { logAudit, AUDIT_ACTIONS, ENTITY_TYPES } = require('../utils/audit');

const STAFF_ROLES = ['admin', 'librarian'];

// Where Supabase sends an invited member of staff to set their password.
// Must also be listed under Authentication > URL Configuration > Redirect URLs
// in the Supabase dashboard, or Supabase falls back to Site URL and the invite
// link arrives without its token.
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

// Loans that still count against a member's allowance. Mirrors the list in
// borrowController — a loan is "open" in both places for the same reason.
const OPEN_STATUSES = ['active', 'overdue'];

/**
 * GET /api/student/dashboard/:id
 * FR-14, FR-15: current borrows + due dates + history
 *
 * Mounted behind requireAuth only, so the :id has to be checked here: any
 * signed-in member could otherwise read another member's loans and full
 * borrowing history just by changing the id in the URL.
 */
const getStudentDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    if (id !== req.user.id && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'You can only view your own borrowing dashboard' });
    }

    const { data: activeLoans, error: activeError } = await supabase
      .from('borrow_records')
      .select('*, books(id, title, author, genre)')
      .eq('user_id', id)
      .eq('status', 'active')
      .order('due_date', { ascending: true });

    if (activeError) throw activeError;

    const { data: history, error: historyError } = await supabase
      .from('borrow_records')
      .select('*, books(id, title, author, genre)')
      .eq('user_id', id)
      .eq('status', 'returned')
      .order('return_date', { ascending: false })
      .limit(20);

    if (historyError) throw historyError;

    const { data: overdueLoans, error: overdueError } = await supabase
      .from('borrow_records')
      .select('*, books(id, title, author, genre)')
      .eq('user_id', id)
      .eq('status', 'overdue');

    if (overdueError) throw overdueError;

    return res.status(200).json({
      activeLoans: activeLoans || [],
      overdueLoans: overdueLoans || [],
      borrowHistory: history || [],
      summary: {
        totalActive: activeLoans?.length || 0,
        totalOverdue: overdueLoans?.length || 0,
        totalBorrowed: (history?.length || 0) + (activeLoans?.length || 0),
      },
    });
  } catch (err) {
    console.error('getStudentDashboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch student dashboard' });
  }
};

/**
 * GET /api/librarian/dashboard
 * Overview stats for librarian
 */
const getLibrarianDashboard = async (req, res) => {
  try {
    const { count: totalBooks, error: booksError } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });

    if (booksError) throw booksError;

    const { count: activeLoans, error: activeError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeError) throw activeError;

    const { count: overdueLoans, error: overdueError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue');

    if (overdueError) throw overdueError;

    const { data: recentActivity, error: recentError } = await supabase
      .from('borrow_records')
      .select('*, books(title, author)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    const { data: overdueList, error: overdueListError } = await supabase
      .from('borrow_records')
      .select('*, books(title, author)')
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(10);

    if (overdueListError) throw overdueListError;

    return res.status(200).json({
      stats: {
        totalBooks: totalBooks || 0,
        activeLoans: activeLoans || 0,
        overdueLoans: overdueLoans || 0,
      },
      recentActivity: recentActivity || [],
      overdueList: overdueList || [],
    });
  } catch (err) {
    console.error('getLibrarianDashboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch librarian dashboard' });
  }
};

/**
 * GET /api/admin/members
 * FR-16: list all members
 */
const getMembers = async (req, res) => {
  try {
    // Named columns rather than '*': users.password_hash has no business
    // leaving the server, even holding the sentinel that it does here.
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('getMembers error:', err);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
};

/**
 * GET /api/admin/members/:id
 *
 * Everything a librarian needs about one member while they are standing at the
 * desk: what they hold now, how much of their allowance is used, what is late,
 * what they owe, and what they have borrowed before.
 *
 * The member list gave name, email, role and join date and nothing else, which
 * answered none of the questions actually asked at a circulation desk. Staff
 * only — a member reads their own equivalent from the student dashboard.
 */
const getMemberDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: member, error: memberError } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role, is_active, created_at')
      .eq('id', id)
      .maybeSingle();

    if (memberError) return res.status(400).json({ error: memberError.message });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Fired together: the desk is waiting on all four, and running them in
    // series makes the screen visibly slower for no benefit.
    const [loansResult, historyResult, finesResult, settings] = await Promise.all([
      supabase
        .from('borrow_records')
        .select('*, books(id, title, author, isbn)')
        .eq('user_id', id)
        .in('status', OPEN_STATUSES)
        .order('due_date', { ascending: true }),
      supabase
        .from('borrow_records')
        .select('*, books(id, title, author, isbn)')
        .eq('user_id', id)
        .eq('status', 'returned')
        .order('return_date', { ascending: false })
        .limit(25),
      supabase
        .from('fines')
        .select('id, amount, status, issued_at, notes, borrow_id')
        .eq('user_id', id)
        .order('issued_at', { ascending: false }),
      getSettings(),
    ]);

    if (loansResult.error) throw loansResult.error;
    if (historyResult.error) throw historyResult.error;

    const openLoans = loansResult.data || [];
    const history = historyResult.data || [];

    // A missing fines table is not an error here. The rest of the screen is
    // still worth showing, and getFines() reports the same condition properly.
    const fines = finesResult.error ? [] : finesResult.data || [];

    const today = new Date().toISOString().slice(0, 10);

    // 'overdue' is only stamped by the nightly job, so a loan can be past due
    // while still marked 'active'. Compare dates as well, or the desk is told
    // a member is clear when they are not.
    const overdueCount = openLoans.filter(
      (l) => l.status === 'overdue' || (l.due_date && String(l.due_date).slice(0, 10) < today)
    ).length;

    const outstanding = Number(
      fines
        .filter((f) => f.status === 'unpaid')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
        .toFixed(2)
    );

    return res.status(200).json({
      member,
      openLoans,
      history,
      fines,
      summary: {
        openLoans: openLoans.length,
        overdueLoans: overdueCount,
        borrowLimit: settings.max_active_borrows,
        // What the desk actually wants to know before scanning a book:
        // can this person take another one out?
        atLimit: openLoans.length >= settings.max_active_borrows,
        totalBorrowed: openLoans.length + history.length,
        outstandingFines: outstanding,
      },
    });
  } catch (err) {
    console.error('getMemberDetail error:', err);
    return res.status(500).json({ error: 'Failed to fetch member details' });
  }
};

/**
 * POST /api/admin/members/invite
 * Body: { email, full_name, role }
 * Admin only.
 *
 * The only route to a librarian account was: the person signs up as a student,
 * then an administrator finds them and promotes them. This creates the account
 * with the right role from the start.
 *
 * Sends an invitation rather than setting a password. An administrator should
 * never choose, see, or transmit someone else's credentials — Supabase emails
 * a one-time link and the invitee sets their own on /reset-password.
 */
const inviteMember = async (req, res) => {
  try {
    const { email, full_name, name, role } = req.body || {};
    const fullName = full_name || name;
    const requestedRole = role || 'librarian';

    if (!email || !fullName) {
      return res.status(400).json({ error: 'Email and full name are required.' });
    }
    if (!VALID_ROLES.includes(requestedRole)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: 'Someone is already registered with that email. Change their role from the member list instead.',
      });
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      // Carried into the auth record so resolveIdentity() reads the right role
      // even on a deploy where public.users is unreadable under RLS.
      data: { full_name: fullName, role: requestedRole },
      redirectTo: `${FRONTEND_URL}/reset-password`,
    });

    if (error) {
      if (/sending.*email|smtp/i.test(error.message)) {
        return res.status(503).json({
          error: 'Invitations are unavailable: the Supabase project cannot send email. Configure SMTP first.',
        });
      }
      return res.status(400).json({ error: error.message });
    }

    // Mirror into public.users so they appear in the member list immediately,
    // rather than only after they accept. Same reasoning as register().
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      full_name: fullName,
      email,
      password_hash: 'managed_by_supabase_auth',
      role: requestedRole,
      is_active: true,
    });

    if (profileError) {
      console.warn('inviteMember: could not mirror into public.users —', profileError.message);
    }

    await logAudit(req, {
      action: AUDIT_ACTIONS.MEMBER_CREATED,
      entityType: ENTITY_TYPES.USER,
      entityId: data.user.id,
      entityLabel: fullName,
      details: { email, role: requestedRole, method: 'invitation' },
    });

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${email}.`,
      profileMirrored: !profileError,
      user: { id: data.user.id, email, full_name: fullName, role: requestedRole },
    });
  } catch (err) {
    console.error('inviteMember error:', err);
    return res.status(500).json({ error: 'Failed to send the invitation' });
  }
};

/**
 * GET /api/admin/borrow-records
 * FR-17: all borrow records
 */
const getBorrowRecords = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('borrow_records')
      // borrow_records has two FKs to users (user_id, processed_by), so the
      // borrower has to be named explicitly by constraint.
      .select('*, books(title, author, isbn), users!borrow_records_user_id_fkey(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('getBorrowRecords error:', err);
    return res.status(500).json({ error: 'Failed to fetch borrow records' });
  }
};

/**
 * GET /api/admin/overdue
 * FR-18: all overdue records
 */
const getOverdueRecords = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('borrow_records')
      // borrow_records has two FKs to users (user_id, processed_by), so the
      // borrower has to be named explicitly by constraint.
      .select('*, books(title, author, isbn), users!borrow_records_user_id_fkey(full_name, email)')
      .eq('status', 'overdue')
      .order('due_date', { ascending: true });

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('getOverdueRecords error:', err);
    return res.status(500).json({ error: 'Failed to fetch overdue records' });
  }
};

/**
 * GET /api/admin/due-soon
 * Query: ?days=<n> — defaults to system_settings.due_soon_days.
 *
 * Loans falling due inside the window, soonest first. The overdue screen is
 * reactive — it lists books the library has already lost track of. This is the
 * preventive counterpart: the desk can call these members before the loan
 * turns into an overdue notice and a fine.
 */
const getDueSoon = async (req, res) => {
  try {
    const settings = await getSettings();
    const requested = Number(req.query.days);
    const days = Number.isInteger(requested) && requested > 0 && requested <= 60
      ? requested
      : settings.due_soon_days;

    const today = new Date();
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + days);

    const asDate = (d) => d.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('borrow_records')
      .select('*, books(title, author, isbn), users!borrow_records_user_id_fkey(full_name, email, phone)')
      // Still open, due from today up to the horizon. Anything already past
      // due belongs on the overdue screen, not here — hence gte(today).
      .in('status', OPEN_STATUSES)
      .gte('due_date', asDate(today))
      .lte('due_date', asDate(horizon))
      .order('due_date', { ascending: true });

    if (error) throw error;

    return res.status(200).json({ days, records: data || [] });
  } catch (err) {
    console.error('getDueSoon error:', err);
    return res.status(500).json({ error: 'Failed to fetch loans due soon' });
  }
};

/**
 * GET /api/admin/stats
 * Aggregated numbers for Admin Governance & Charts screen
 */
const getAdminStats = async (req, res) => {
  try {
    const { count: totalBooks, error: booksError } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });

    if (booksError) throw booksError;

    const { count: totalMembers, error: membersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (membersError) throw membersError;

    const { count: activeLoans, error: activeError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeError) throw activeError;

    const { count: overdueLoans, error: overdueError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue');

    if (overdueError) throw overdueError;

    // Borrows per month (last 6 months)
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

      const { count, error } = await supabase
        .from('borrow_records')
        .select('*', { count: 'exact', head: true })
        .gte('borrow_date', start)
        .lte('borrow_date', end);

      if (!error) {
        months.push({
          month: monthNames[date.getMonth()],
          count: count || 0,
        });
      }
    }

    return res.status(200).json({
      totalBooks: totalBooks || 0,
      totalMembers: totalMembers || 0,
      activeLoans: activeLoans || 0,
      overdueLoans: overdueLoans || 0,
      borrowsPerMonth: months,
    });
  } catch (err) {
    console.error('getAdminStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
};

/* =============================================================
 * MEMBER ADMINISTRATION (FR-16)
 * ============================================================= */

const VALID_ROLES = ['student', 'librarian', 'admin'];

/**
 * Mirror a role or activation change into the auth record's user_metadata.
 *
 * public.users is the source of truth, but resolveIdentity() falls back to
 * user_metadata whenever that table can't be read. Writing only public.users
 * left the fallback holding whatever was true at sign-up — so a demoted admin
 * kept administrator access, and a deactivated member kept getting in, on any
 * deploy where the fallback was in play.
 *
 * Best-effort: the public.users write has already succeeded and is what the
 * app reads normally, so a failure here is logged rather than surfaced. Needs
 * the service role key — the admin API rejects the anon key.
 */
const mirrorToAuthMetadata = async (userId, patch) => {
  let failure;
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, { user_metadata: patch });
    failure = error?.message;
  } catch (err) {
    // updateUserById *throws* on a malformed id rather than returning an error.
    // The primary write has already succeeded, so nothing here may take the
    // request down with it.
    failure = err.message;
  }

  if (failure) {
    console.warn(
      `mirrorToAuthMetadata: could not update auth metadata for ${userId} —`,
      `${failure}. public.users is updated; the user_metadata fallback is now stale.`
    );
  }
  return !failure;
};

/**
 * PUT /api/admin/members/:id/role
 * Body: { role }
 */
const updateMemberRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    // An admin demoting themselves would lock them out mid-session.
    if (id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    // Read the old role before overwriting it: "student → librarian" is the
    // line worth having in the audit log, and after the update it is gone.
    const { data: before } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id, full_name, email, role, is_active')
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Member not found' });

    await logAudit(req, {
      action: AUDIT_ACTIONS.MEMBER_ROLE_CHANGED,
      entityType: ENTITY_TYPES.USER,
      entityId: id,
      entityLabel: data.full_name,
      details: { email: data.email, from: before?.role || null, to: role },
    });

    // Keep the auth record's copy of the role in step, or the metadata
    // fallback will keep granting the role this call just took away.
    const mirrored = await mirrorToAuthMetadata(id, { role });

    return res.status(200).json({ success: true, user: data, authMetadataMirrored: mirrored });
  } catch (err) {
    console.error('updateMemberRole error:', err);
    return res.status(500).json({ error: 'Failed to update role' });
  }
};

/**
 * PUT /api/admin/members/:id/deactivate
 * Soft-delete: is_active = false. requireAuth then rejects every request
 * they make, so this is what actually locks an account out.
 */
const deactivateMember = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    // Refuse while they still hold books, or the loans become unreturnable.
    const { count: openLoans, error: loanError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)
      .in('status', ['active', 'overdue']);

    if (loanError) throw loanError;
    if (openLoans > 0) {
      return res.status(400).json({
        error: `This member still has ${openLoans} book(s) on loan. Process the returns first.`,
      });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select('id, full_name, email, role, is_active')
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Member not found' });

    await logAudit(req, {
      action: AUDIT_ACTIONS.MEMBER_DEACTIVATED,
      entityType: ENTITY_TYPES.USER,
      entityId: id,
      entityLabel: data.full_name,
      details: { email: data.email, role: data.role },
    });

    const mirrored = await mirrorToAuthMetadata(id, { is_active: false });

    return res.status(200).json({ success: true, user: data, authMetadataMirrored: mirrored });
  } catch (err) {
    console.error('deactivateMember error:', err);
    return res.status(500).json({ error: 'Failed to deactivate account' });
  }
};

/**
 * PUT /api/admin/members/:id/reactivate
 * The counterpart to deactivate — without it a deactivation is permanent.
 */
const reactivateMember = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', req.params.id)
      .select('id, full_name, email, role, is_active')
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Member not found' });

    await logAudit(req, {
      action: AUDIT_ACTIONS.MEMBER_REACTIVATED,
      entityType: ENTITY_TYPES.USER,
      entityId: req.params.id,
      entityLabel: data.full_name,
      details: { email: data.email, role: data.role },
    });

    const mirrored = await mirrorToAuthMetadata(req.params.id, { is_active: true });

    return res.status(200).json({ success: true, user: data, authMetadataMirrored: mirrored });
  } catch (err) {
    console.error('reactivateMember error:', err);
    return res.status(500).json({ error: 'Failed to reactivate account' });
  }
};

/* =============================================================
 * REPORTS (FR-18)
 *
 * These aggregate in JS because supabase-js has no GROUP BY. Each one
 * reads at most the default 1000-row page; past that they need Postgres
 * RPCs. Fine at the 5,000-member / 10,000-book scale in the SRS, but it
 * is the first thing to revisit if the library grows.
 * ============================================================= */

/** GET /api/admin/reports/genres — collection breakdown by genre */
const getGenreReport = async (req, res) => {
  try {
    const { data, error } = await supabase.from('books').select('genre');
    if (error) throw error;

    const counts = {};
    (data || []).forEach((b) => {
      const genre = b.genre || 'Unclassified';
      counts[genre] = (counts[genre] || 0) + 1;
    });

    return res.status(200).json(
      Object.entries(counts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
    );
  } catch (err) {
    console.error('getGenreReport error:', err);
    return res.status(500).json({ error: 'Failed to fetch genre report' });
  }
};

/** GET /api/admin/reports/trends — borrows per calendar month */
const getTrendsReport = async (req, res) => {
  try {
    const { data, error } = await supabase.from('borrow_records').select('borrow_date');
    if (error) throw error;

    const monthly = {};
    (data || []).forEach((r) => {
      if (!r.borrow_date) return;
      const month = String(r.borrow_date).slice(0, 7); // "2026-07"
      monthly[month] = (monthly[month] || 0) + 1;
    });

    return res.status(200).json(
      Object.entries(monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }))
    );
  } catch (err) {
    console.error('getTrendsReport error:', err);
    return res.status(500).json({ error: 'Failed to fetch borrowing trends' });
  }
};

/** GET /api/admin/reports/top-books — 10 most borrowed titles */
const getTopBooksReport = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('borrow_records')
      .select('book_id, books(title, author)');
    if (error) throw error;

    const counts = {};
    const info = {};
    (data || []).forEach((r) => {
      if (!r.books) return;
      counts[r.book_id] = (counts[r.book_id] || 0) + 1;
      info[r.book_id] = r.books;
    });

    return res.status(200).json(
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ ...info[id], borrow_count: count }))
    );
  } catch (err) {
    console.error('getTopBooksReport error:', err);
    return res.status(500).json({ error: 'Failed to fetch top books' });
  }
};

/** GET /api/admin/reports/overdue-rate — share of open loans that are late */
const getOverdueRateReport = async (req, res) => {
  try {
    // 'overdue' is only stamped by the nightly job, so a loan can be past due
    // while still marked 'active'. Count both statuses and compare dates.
    const { data, error } = await supabase
      .from('borrow_records')
      .select('status, due_date')
      .in('status', ['active', 'overdue']);

    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const total = (data || []).length;
    const overdue = (data || []).filter(
      (r) => r.status === 'overdue' || (r.due_date && String(r.due_date).slice(0, 10) < today)
    ).length;

    return res.status(200).json({
      total,
      overdue,
      rate: total ? Number(((overdue / total) * 100).toFixed(1)) : 0,
    });
  } catch (err) {
    console.error('getOverdueRateReport error:', err);
    return res.status(500).json({ error: 'Failed to fetch overdue rate' });
  }
};

/** GET /api/admin/reports/top-borrowers — 10 most active members */
const getTopBorrowersReport = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('borrow_records')
      .select('user_id, users!borrow_records_user_id_fkey(full_name, email)');
    if (error) throw error;

    const counts = {};
    const info = {};
    (data || []).forEach((r) => {
      if (!r.users) return;
      counts[r.user_id] = (counts[r.user_id] || 0) + 1;
      info[r.user_id] = r.users;
    });

    return res.status(200).json(
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ ...info[id], borrow_count: count }))
    );
  } catch (err) {
    console.error('getTopBorrowersReport error:', err);
    return res.status(500).json({ error: 'Failed to fetch top borrowers' });
  }
};

module.exports = {
  getStudentDashboard,
  getLibrarianDashboard,
  getMembers,
  getMemberDetail,
  inviteMember,
  getBorrowRecords,
  getOverdueRecords,
  getDueSoon,
  getAdminStats,
  updateMemberRole,
  deactivateMember,
  reactivateMember,
  getGenreReport,
  getTrendsReport,
  getTopBooksReport,
  getOverdueRateReport,
  getTopBorrowersReport,
};