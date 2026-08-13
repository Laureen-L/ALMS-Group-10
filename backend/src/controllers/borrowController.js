const supabase = require('../config/supabaseClient');
const { normalizeIsbn } = require('../utils/isbn');

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

const MAX_ACTIVE_BORROWS = 5;
const LOAN_PERIOD_DAYS = 14;
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

  const query = supabase.from('books').select('id, title, isbn, available_quantity');
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

    // FR-09: count this member's open loans
    const { count: activeBorrowCount, error: countError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', OPEN_STATUSES);

    if (countError) throw countError;

    if (activeBorrowCount >= MAX_ACTIVE_BORROWS) {
      return res.status(400).json({
        error: `Borrow limit reached. A member cannot have more than ${MAX_ACTIVE_BORROWS} books out at once.`,
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
    dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);
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

    return res.status(200).json({
      success: true,
      message: 'Book returned successfully',
      borrow: updatedBorrow,
    });
  } catch (err) {
    console.error('returnBook error:', err);
    return res.status(500).json({ error: 'Something went wrong while returning the book' });
  }
};

module.exports = {
  borrowBook,
  returnBook,
};
