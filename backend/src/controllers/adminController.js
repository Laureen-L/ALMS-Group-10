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
      .from('profiles')
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
      .from('profiles')
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

module.exports = {
  getStudentDashboard,
  getLibrarianDashboard,
  getMembers,
  getBorrowRecords,
  getOverdueRecords,
  getAdminStats,
};