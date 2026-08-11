const supabase = require('../config/supabaseClient');

/**
 * GET /api/student/dashboard/:id
 * FR-14, FR-15: current borrows + due dates + history
 */
const getStudentDashboard = async (req, res) => {
  try {
    const { id } = req.params;

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
    const { data, error } = await supabase
      .from('users')
      .select('*')
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
      .select('*, books(title, author, isbn)')
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
      .select('*, books(title, author, isbn)')
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
/**
 * PUT /api/admin/members/:id/role
 * Task 8 (Dev D): change a member's role
 */
const VALID_ROLES = ['student', 'librarian', 'admin'];

const updateMemberRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id, full_name, email, role, is_active')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Member not found' });

    return res.status(200).json({ success: true, member: data });
  } catch (err) {
    console.error('updateMemberRole error:', err);
    return res.status(500).json({ error: 'Failed to update member role' });
  }
};

/**
 * PUT /api/admin/members/:id/deactivate
 * Task 8 (Dev D): deactivate a member's account (soft-disable, FR-04 style)
 */
const deactivateMember = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select('id, full_name, email, role, is_active')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Member not found' });

    return res.status(200).json({ success: true, member: data });
  } catch (err) {
    console.error('deactivateMember error:', err);
    return res.status(500).json({ error: 'Failed to deactivate member' });
  }
};
/**
 * GET /api/admin/reports/genres
 * Task 9 (Dev D): book count per genre, for the admin genre pie chart
 */
const getGenreReport = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('genre');

    if (error) throw error;

    const counts = {};
    (data || []).forEach((b) => {
      const genre = b.genre || 'Uncategorized';
      counts[genre] = (counts[genre] || 0) + 1;
    });

    const report = Object.entries(counts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json(report);
  } catch (err) {
    console.error('getGenreReport error:', err);
    return res.status(500).json({ error: 'Failed to fetch genre report' });
  }
};

/**
 * GET /api/admin/reports/trends
 * Task 9 (Dev D): borrowing trends per month, for the admin trends line chart
 */
const getBorrowingTrends = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('borrow_records')
      .select('borrow_date');

    if (error) throw error;

    const monthly = {};
    (data || []).forEach((r) => {
      if (!r.borrow_date) return;
      const month = String(r.borrow_date).slice(0, 7); // "2026-07"
      monthly[month] = (monthly[month] || 0) + 1;
    });

    const trends = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    return res.status(200).json(trends);
  } catch (err) {
    console.error('getBorrowingTrends error:', err);
    return res.status(500).json({ error: 'Failed to fetch borrowing trends' });
  }
};

/**
 * GET /api/admin/reports/top-books
 * Task 9 (Dev D): top 10 most borrowed books
 */
const getTopBooks = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('borrow_records')
      .select('book_id, books(title, author)');

    if (error) throw error;

    const counts = {};
    (data || []).forEach((r) => {
      if (!r.book_id) return;
      if (!counts[r.book_id]) {
        counts[r.book_id] = {
          title: r.books?.title || 'Unknown',
          author: r.books?.author || 'Unknown',
          borrows: 0,
        };
      }
      counts[r.book_id].borrows += 1;
    });

    const topBooks = Object.values(counts)
      .sort((a, b) => b.borrows - a.borrows)
      .slice(0, 10);

    return res.status(200).json(topBooks);
  } catch (err) {
    console.error('getTopBooks error:', err);
    return res.status(500).json({ error: 'Failed to fetch top books' });
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
  getGenreReport,
  getBorrowingTrends,
  getTopBooks,
};