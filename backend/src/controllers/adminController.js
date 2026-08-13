const supabase = require('../config/supabaseClient');

const STAFF_ROLES = ['admin', 'librarian'];

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

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id, full_name, email, role, is_active')
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Member not found' });

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
  getBorrowRecords,
  getOverdueRecords,
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