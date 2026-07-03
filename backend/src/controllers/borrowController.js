const supabase = require('../config/supabaseClient');

/*
 * Confirmed real schema (checked directly in Supabase dashboard):
 *
 * books
 *   - id, title, author, isbn, genre, quantity, available_quantity,
 *     added_by, created_at, updated_at
 *
 * borrow_records
 *   - id, user_id, book_id, processed_by, borrow_date, due_date,
 *     return_date, status (enum: 'active' | 'returned' | 'overdue'),
 *     notes, created_at, updated_at
 */

const MAX_ACTIVE_BORROWS = 5;
const LOAN_PERIOD_DAYS = 14;

/**
 * POST /api/borrow
 * FR-09: user cannot have more than 5 active borrows
 * FR-10: book must have available_quantity > 0
 * FR-12: create borrow record, due date = today + 14 days
 * FR-13: decrement available_quantity
 */
const borrowBook = async (req, res) => {
  try {
    const userId = req.user.id; // set by requireAuth middleware
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: 'bookId is required' });
    }

    // FR-09: check active borrow count for this user
    const { count: activeBorrowCount, error: countError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (countError) throw countError;

    if (activeBorrowCount >= MAX_ACTIVE_BORROWS) {
      return res.status(400).json({
        error: `Borrow limit reached. You cannot have more than ${MAX_ACTIVE_BORROWS} active borrows.`,
      });
    }

    // FR-10: check book availability
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, available_quantity')
      .eq('id', bookId)
      .single();
if (bookError || !book) {
 
  return res.status(404).json({ error: 'Book not found' });
}

    if (book.available_quantity <= 0) {
      return res.status(400).json({ error: 'No available copies of this book' });
    }

    // FR-12: create the borrow record with due date = today + 14 days
    const borrowDate = new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);

    const { data: borrowRecord, error: insertError } = await supabase
      .from('borrow_records')
      .insert({
        user_id: userId,
        book_id: bookId,
        borrow_date: borrowDate.toISOString(),
        due_date: dueDate.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // FR-13: decrement available_quantity
    const { error: updateError } = await supabase
      .from('books')
      .update({ available_quantity: book.available_quantity - 1 })
      .eq('id', bookId);

    if (updateError) {
      // Best-effort rollback of the borrow record since Supabase JS
      // doesn't give us a multi-table transaction here.
      await supabase.from('borrow_records').delete().eq('id', borrowRecord.id);
      throw updateError;
    }

    return res.status(201).json({
      message: 'Book borrowed successfully',
      borrow: borrowRecord,
    });
  } catch (err) {
    console.error('borrowBook error:', err);
    return res.status(500).json({ error: 'Something went wrong while borrowing the book' });
  }
};

/**
 * POST /api/return
 * FR-11: mark the borrow record as returned
 * FR-12: set return_date
 * FR-13: increment available_quantity
 */
const returnBook = async (req, res) => {
  try {
    const userId = req.user.id;
    const { borrowId } = req.body;

    if (!borrowId) {
      return res.status(400).json({ error: 'borrowId is required' });
    }
   
    const { data: borrowRecord, error: fetchError } = await supabase
      .from('borrow_records')
      .select('*')
      .eq('id', borrowId)
      .single();

    if (fetchError || !borrowRecord) {
      return res.status(404).json({ error: 'Borrow record not found' });
    }

    if (borrowRecord.user_id !== userId) {
      return res.status(403).json({ error: 'This borrow record does not belong to you' });
    }

    if (borrowRecord.status === 'returned') {
      return res.status(400).json({ error: 'This book has already been returned' });
    }

    // FR-11: mark as returned
    const { data: updatedBorrow, error: updateBorrowError } = await supabase
      .from('borrow_records')
      .update({
        status: 'returned',
        return_date: new Date().toISOString(),
      })
      .eq('id', borrowId)
      .select()
      .single();

    if (updateBorrowError) throw updateBorrowError;

    // FR-13: increment available_quantity back on the book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, available_quantity')
      .eq('id', borrowRecord.book_id)
      .single();

    if (!bookError && book) {
      await supabase
        .from('books')
        .update({ available_quantity: book.available_quantity + 1 })
        .eq('id', book.id);
    }

    return res.status(200).json({
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