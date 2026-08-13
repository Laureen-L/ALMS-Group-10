const supabase = require('../config/supabaseClient');
const { normalizeIsbn } = require('../utils/isbn');
const { getSettings } = require('./settingsController');
const { issueFineForLoan } = require('./fineController');
const { logAudit, AUDIT_ACTIONS, ENTITY_TYPES } = require('../utils/audit');

/*
 * Schema (see prisma/schema.prisma):
 *
 * books
 *   - id, title, author, isbn, genre, quantity, available_quantity,
 *     added_by, created_at, updated_at
 *
 * borrow_records
 *   - id, user_id, book_id, processed_by, borrow_date, due_date,
 *     return_date, status (enum: 'active' | 'returned' | 'overdue'),
 *     notes, created_at, updated_at
 *
 * IMPORTANT — availability is maintained by the database, not here.
 * The trigger `trg_update_availability` (prisma/migrations/20260623024516_triggers)
 * decrements books.available_quantity on INSERT of an active loan and
 * increments it when a loan flips to 'returned'. This controller used to do
 * the same update by hand, which moved stock by 2 per transaction. The manual
 * updates have been removed; the trigger is the single source of truth.
 */

/*
 * The borrow limit and loan period used to be the two constants below. They
 * now come from system_settings via getSettings(), so an administrator changes
 * library policy from the Settings screen instead of editing this file and
 * redeploying. getSettings() returns exactly these numbers as its defaults, so
 * behaviour is unchanged on a database where the migration has not been run.
 */
const STAFF_ROLES = ['admin', 'librarian'];

// Loans that still count against a member's allowance.
const OPEN_STATUSES = ['active', 'overdue'];

/**
 * Find the book being transacted. Accepts either an ISBN (circulation desk,
 * scanned) or a bookId (student borrowing from the catalog).
 */
const resolveBook = async ({ isbn, bookId }) => {
  if (!isbn && !bookId) {
    return { error: { status: 400, message: 'Provide either isbn or bookId' } };
  }

  const query = supabase.from('books').select('id, title, isbn, available_quantity, withdrawn_at');
  // Scanners and typists produce hyphenated ISBNs; the column stores the bare
  // form. Without normalising, an exact match here reports "Book not found"
  // for a book that is sitting in the catalogue.
  const { data, error } = isbn
    ? await query.eq('isbn', normalizeIsbn(isbn)).maybeSingle()
    : await query.eq('id', bookId).maybeSingle();

  if (error) return { error: { status: 400, message: error.message } };
  if (!data) return { error: { status: 404, message: 'Book not found' } };

  return { book: data };
};

/**
 * Work out who the loan is for. Staff at the circulation desk may act on
 * behalf of a member by email; everyone else borrows for themselves.
 */
const resolveBorrower = async (req) => {
  const { memberEmail } = req.body;
  if (!memberEmail) return { userId: req.user.id };

  if (!STAFF_ROLES.includes(req.user.role)) {
    return { error: { status: 403, message: 'Only staff can borrow on behalf of a member' } };
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, is_active')
    .eq('email', memberEmail)
    .maybeSingle();

  if (error) return { error: { status: 400, message: error.message } };
  if (!data) return { error: { status: 404, message: 'Member not found' } };
  if (data.is_active === false) {
    return { error: { status: 403, message: 'This member’s account is deactivated' } };
  }

  return { userId: data.id, onBehalf: true };
};

/**
 * POST /api/borrow
 * Body: { isbn } | { bookId }, plus optional { memberEmail } for staff.
 * FR-09: no more than 5 open borrows per member
 * FR-10: book must have available_quantity > 0
 * FR-12: due date = today + 14 days
 * FR-13: availability adjusted by trg_update_availability
 */
const borrowBook = async (req, res) => {
  try {
    const borrower = await resolveBorrower(req);
    if (borrower.error) {
      return res.status(borrower.error.status).json({ error: borrower.error.message });
    }
    const { userId, onBehalf } = borrower;

    const resolved = await resolveBook(req.body);
    if (resolved.error) {
      return res.status(resolved.error.status).json({ error: resolved.error.message });
    }
    const { book } = resolved;

    // A withdrawn title keeps its copies and its history, so the stock check
    // below would happily lend one out. Withdrawal has to bite here.
    if (book.withdrawn_at) {
      return res.status(400).json({
        error: `“${book.title}” has been withdrawn from circulation and cannot be borrowed.`,
      });
    }

    const settings = await getSettings();

    // FR-09: count this member's open loans
    const { count: activeBorrowCount, error: countError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', OPEN_STATUSES);

    if (countError) throw countError;

    if (activeBorrowCount >= settings.max_active_borrows) {
      return res.status(400).json({
        error: `Borrow limit reached. A member cannot have more than ${settings.max_active_borrows} books out at once.`,
      });
    }

    // FR-10: stock check
    if (book.available_quantity <= 0) {
      return res.status(400).json({ error: 'No copies available' });
    }

    // Don't let the same member take a second copy of a book they already hold.
    const { count: alreadyHolding, error: dupError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('book_id', book.id)
      .in('status', OPEN_STATUSES);

    if (dupError) throw dupError;
    if (alreadyHolding > 0) {
      return res.status(400).json({ error: 'This member already has a copy of this book on loan' });
    }

    // FR-12: due date = borrow date + 14 days. borrow_date/due_date are DATE
    // columns, so send plain YYYY-MM-DD rather than a full timestamp.
    const borrowDate = new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + settings.loan_period_days);
    const asDate = (d) => d.toISOString().slice(0, 10);

    const { data: borrowRecord, error: insertError } = await supabase
      .from('borrow_records')
      .insert({
        user_id: userId,
        book_id: book.id,
        // Records who ran the transaction when a librarian did it at the desk.
        processed_by: onBehalf ? req.user.id : null,
        borrow_date: asDate(borrowDate),
        due_date: asDate(dueDate),
        status: 'active',
      })
      .select('*, books(title, author, isbn)')
      .single();

    if (insertError) throw insertError;

    return res.status(201).json({
      success: true,
      message: 'Book borrowed successfully',
      borrow: borrowRecord,
    });
  } catch (err) {
    // The stock check above and the trigger's decrement are separate
    // statements, so two desks checking out the last copy at once can both
    // pass the check. The CHECK constraint on available_quantity catches it —
    // report that as the "no copies left" it actually is, not a 500.
    if (err.code === '23514') {
      return res.status(409).json({
        error: 'The last copy was taken a moment ago. Refresh and try again.',
      });
    }
    console.error('borrowBook error:', err);
    return res.status(500).json({ error: 'Something went wrong while borrowing the book' });
  }
};

/**
 * POST /api/return
 * Body: { borrowId } | { isbn }
 * A member may return only their own loan; staff may return anyone's, which is
 * what makes the ISBN path work at the desk.
 * FR-11/FR-12: mark returned + stamp return_date
 * FR-13: availability adjusted by trg_update_availability
 */
const returnBook = async (req, res) => {
  try {
    const { borrowId, isbn } = req.body;
    const isStaff = STAFF_ROLES.includes(req.user.role);

    if (!borrowId && !isbn) {
      return res.status(400).json({ error: 'Provide either borrowId or isbn' });
    }

    let borrowRecord;

    if (borrowId) {
      const { data, error } = await supabase
        .from('borrow_records')
        .select('*')
        .eq('id', borrowId)
        .maybeSingle();

      if (error) return res.status(400).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Borrow record not found' });
      borrowRecord = data;
    } else {
      // ISBN path: find the open loan for that book. A member returning by
      // ISBN can only match their own loan; staff match whoever holds it.
      const resolved = await resolveBook({ isbn });
      if (resolved.error) {
        return res.status(resolved.error.status).json({ error: resolved.error.message });
      }

      let query = supabase
        .from('borrow_records')
        .select('*')
        .eq('book_id', resolved.book.id)
        .in('status', OPEN_STATUSES)
        .order('borrow_date', { ascending: true })
        .limit(1);

      if (!isStaff) query = query.eq('user_id', req.user.id);

      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'No open loan found for this book' });
      }
      borrowRecord = data[0];
    }

    if (!isStaff && borrowRecord.user_id !== req.user.id) {
      return res.status(403).json({ error: 'This borrow record does not belong to you' });
    }

    if (borrowRecord.status === 'returned') {
      return res.status(400).json({ error: 'This book has already been returned' });
    }

    const { data: updatedBorrow, error: updateBorrowError } = await supabase
      .from('borrow_records')
      .update({
        status: 'returned',
        return_date: new Date().toISOString().slice(0, 10),
      })
      .eq('id', borrowRecord.id)
      .select('*, books(title, author, isbn)')
      .single();

    if (updateBorrowError) throw updateBorrowError;

    // Charge for a late return. issueFineForLoan never throws and never
    // rejects: the book is already back and the loan is already closed, so a
    // problem writing the fine must not turn a successful return into a 500
    // that tells the member their return failed.
    const fine = await issueFineForLoan(updatedBorrow, { title: updatedBorrow.books?.title });

    return res.status(200).json({
      success: true,
      message: fine.issued
        ? `Book returned. A late fine of GHS ${fine.amount.toFixed(2)} was issued (${fine.days} day(s) overdue).`
        : 'Book returned successfully',
      borrow: updatedBorrow,
      fine: fine.issued ? { amount: fine.amount, days: fine.days } : null,
    });
  } catch (err) {
    console.error('returnBook error:', err);
    return res.status(500).json({ error: 'Something went wrong while returning the book' });
  }
};

/**
 * POST /api/renew
 * Body: { borrowId }
 *
 * Extends an open loan by system_settings.renewal_period_days.
 *
 * Nothing in the system could previously extend a loan: a book ran its 14 days
 * and then went overdue, and the only way to avoid that was to walk it back to
 * the desk. A member may renew their own loan; staff may renew anyone's.
 *
 * Refused on an overdue loan. A renewal is a favour granted before the
 * deadline, not a way to erase one that has already passed — allowing it would
 * also mean a member could dodge the fine issued on return.
 */
const renewLoan = async (req, res) => {
  try {
    const { borrowId } = req.body || {};
    const isStaff = STAFF_ROLES.includes(req.user.role);

    if (!borrowId) return res.status(400).json({ error: 'Provide borrowId' });

    const { data: loan, error: readError } = await supabase
      .from('borrow_records')
      .select('*, books(title, author)')
      .eq('id', borrowId)
      .maybeSingle();

    if (readError) return res.status(400).json({ error: readError.message });
    if (!loan) return res.status(404).json({ error: 'Borrow record not found' });

    if (!isStaff && loan.user_id !== req.user.id) {
      return res.status(403).json({ error: 'This borrow record does not belong to you' });
    }
    if (loan.status === 'returned') {
      return res.status(400).json({ error: 'This book has already been returned.' });
    }

    const settings = await getSettings();
    const today = new Date().toISOString().slice(0, 10);

    // due_date is NOT NULL in the schema, so this should be unreachable — but
    // the alternative to checking is writing a wrong date. `new Date(null)` is
    // 1970-01-01, not Invalid Date, so a missing value would sail past both the
    // overdue check below (which compares the string "null") and the
    // arithmetic, and quietly set the loan due in 1970.
    if (!loan.due_date) {
      return res.status(409).json({ error: 'This loan has no due date and cannot be renewed.' });
    }

    const dueDate = String(loan.due_date).slice(0, 10);

    // Check the date as well as the status: 'overdue' is only stamped by the
    // nightly job, so a loan can be days past due and still read 'active'.
    if (loan.status === 'overdue' || dueDate < today) {
      return res.status(400).json({
        error: 'This loan is already overdue and cannot be renewed. Please return the book.',
      });
    }

    const used = loan.renewal_count || 0;
    if (used >= settings.max_renewals) {
      return res.status(400).json({
        error: settings.max_renewals === 0
          ? 'Renewals are not allowed under current library policy.'
          : `This loan has already been renewed ${used} time(s), the maximum allowed.`,
      });
    }

    // Extended from the current due date, not from today. Renewing early would
    // otherwise shorten the loan, which is the opposite of what was asked for.
    const newDue = new Date(loan.due_date);
    newDue.setDate(newDue.getDate() + settings.renewal_period_days);

    const { data, error } = await supabase
      .from('borrow_records')
      .update({ due_date: newDue.toISOString().slice(0, 10), renewal_count: used + 1 })
      .eq('id', borrowId)
      .select('*, books(title, author, isbn)')
      .maybeSingle();

    if (error) {
      if (error.code === '42703') {
        return res.status(503).json({
          error: 'Renewals are not set up yet. Run the governance migration first.',
        });
      }
      return res.status(400).json({ error: error.message });
    }

    await logAudit(req, {
      action: AUDIT_ACTIONS.LOAN_RENEWED,
      entityType: ENTITY_TYPES.LOAN,
      entityId: borrowId,
      entityLabel: loan.books?.title || 'loan',
      details: {
        from: dueDate,
        to: data.due_date,
        renewalNumber: used + 1,
        of: settings.max_renewals,
        byStaff: isStaff && loan.user_id !== req.user.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Renewed until ${data.due_date}. ${settings.max_renewals - (used + 1)} renewal(s) left.`,
      borrow: data,
      renewalsLeft: settings.max_renewals - (used + 1),
    });
  } catch (err) {
    console.error('renewLoan error:', err);
    return res.status(500).json({ error: 'Something went wrong while renewing the loan' });
  }
};

module.exports = {
  borrowBook,
  returnBook,
  renewLoan,
};
