const supabase = require('../config/supabaseClient');

/*
 * ASSUMPTIONS ABOUT YOUR TABLES — adjust if your real schema differs:
 *
 * books
 *   - id
 *   - available_count
 *
 * borrows
 *   - id
 *   - user_id
 *   - book_id
 *   - borrow_date
 *   - due_date
 *   - return_date
 *   - status   ('active' | 'returned')
 */

const MAX_ACTIVE_BORROWS = 5;
const LOAN_PERIOD_DAYS = 14;

const borrowBook = async (req, res) => {
  try {
    const userId = req.user.id; // set by requireAuth middleware
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: 'bookId is required' });
    }

    const { count: activeBorrowCount, error: countError } = await supabase
      .from('borrows')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (countError) throw countError;

    if (activeBorrowCount >= MAX_ACTIVE_BORROWS) {
      return res.status(400).json({
        error: `Borrow limit reached. You cannot have more than ${MAX_ACTIVE_BORROWS} active borrows.`,
      });
    }

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, available_count')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.available_count <= 0) {
      return res.status(400).json({ error: 'No available copies of this book' });
    }

    const borrowDate = new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);

    const { data: borrowRecord, error: insertError } = await supabase
      .from('borrows')
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

    const { error: updateError } = await supabase
      .from('books')
      .update({ available_count: book.available_count - 1 })
      .eq('id', bookId);

    if (updateError) {
      await supabase.from('borrows').delete().eq('id', borrowRecord.id);
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

const returnBook = async (req, res) => {
  try {
    const userId = req.user.id;
    const { borrowId } = req.body;

    if (!borrowId) {
      return res.status(400).json({ error: 'borrowId is required' });
    }

    const { data: borrowRecord, error: fetchError } = await supabase
      .from('borrows')
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

    const { data: updatedBorrow, error: updateBorrowError } = await supabase
      .from('borrows')
      .update({
        status: 'returned',
        return_date: new Date().toISOString(),
      })
      .eq('id', borrowId)
      .select()
      .single();

    if (updateBorrowError) throw updateBorrowError;

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, available_count')
      .eq('id', borrowRecord.book_id)
      .single();

    if (!bookError && book) {
      await supabase
        .from('books')
        .update({ available_count: book.available_count + 1 })
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