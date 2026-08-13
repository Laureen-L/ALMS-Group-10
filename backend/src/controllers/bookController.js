const supabase = require('../config/supabaseClient');
const { normalizeIsbn, isValidIsbn } = require('../utils/isbn');
const { getSettings } = require('./settingsController');
const { logAudit, AUDIT_ACTIONS, ENTITY_TYPES } = require('../utils/audit');

/*
 * Withdrawn titles are filtered in JavaScript rather than with a
 * .is('withdrawn_at', null) clause on the query.
 *
 * The column arrives with the governance migration, and PostgREST answers a
 * filter on a column that does not exist with an error — which would take the
 * public catalogue down on any database where that migration has not been run
 * yet. Reading the field instead yields `undefined` there, so every book is
 * treated as in circulation, exactly as before the feature existed.
 *
 * The cost is that withdrawn rows still count towards PostgREST's 1000-row
 * default page. At the 10,000-book scale in the SRS this needs a real filter
 * (and by then the migration will long since have run).
 */
const isInCirculation = (book) => !book.withdrawn_at;

/*
 * The columns a librarian may set on a book. Everything else in the table is
 * owned elsewhere: `id` and `created_at` by the database, `updated_at` by
 * trg_books_updated_at, `added_by` by this controller from the caller's token.
 *
 * Whitelisting matters because the request body used to be handed to
 * .insert()/.update() whole, so a client could set any column it named —
 * reassigning `added_by`, or overwriting the loan-derived
 * `available_quantity`.
 */
const EDITABLE_FIELDS = ['title', 'author', 'isbn', 'genre', 'quantity', 'available_quantity'];

/**
 * Take only the editable fields the caller actually sent, normalising the ISBN
 * so stored and scanned values always match.
 * Returns { patch } or { error } with a message for the client.
 */
const buildBookPatch = (body = {}) => {
    const patch = {};

    for (const field of EDITABLE_FIELDS) {
        if (body[field] !== undefined) patch[field] = body[field];
    }

    if (patch.isbn !== undefined) {
        patch.isbn = normalizeIsbn(patch.isbn);
        if (!isValidIsbn(patch.isbn)) {
            return { error: 'ISBN must have 10 or 13 digits (hyphens and spaces are ignored).' };
        }
    }

    for (const field of ['quantity', 'available_quantity']) {
        if (patch[field] === undefined) continue;
        const n = Number(patch[field]);
        if (!Number.isInteger(n) || n < 0) {
            return { error: `${field} must be a whole number of 0 or more.` };
        }
        patch[field] = n;
    }

    // The CHECK constraint on books enforces this too, but as an opaque 400.
    if (patch.available_quantity > patch.quantity) {
        return { error: 'available_quantity cannot exceed quantity.' };
    }

    return { patch };
};

// PostgREST parses .or() as a comma-separated filter list, so an unescaped
// comma or parenthesis in the search term is read as filter syntax rather than
// as text. Drop those characters; `%` and `_` are left alone because a member
// typing them into a search box means them as wildcards.
const escapeFilterValue = (value) => String(value).replace(/[,()]/g, ' ');

const getBooks = async (req, res) => {
    try {
        const { search, genre, includeWithdrawn } = req.query;
        let query = supabase.from('books').select('*');

        if (genre) query = query.eq('genre', genre);
        // Match either title or author — the search box offers both.
        if (search) {
            const term = escapeFilterValue(search);
            query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%`);
        }

        const { data, error } = await query;

        // Handle Supabase error directly instead of throwing
        if (error) return res.status(400).json({ error: error.message });

        // Staff catalogue passes includeWithdrawn=true so a librarian can find
        // a withdrawn title and put it back. Everyone else sees circulation
        // only — a member should never be offered a book they cannot borrow.
        const books = includeWithdrawn === 'true' ? (data || []) : (data || []).filter(isInCirculation);

        res.status(200).json(books);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/books/low-stock
 * Staff. Titles at or below system_settings.low_stock_threshold available
 * copies, plus anything fully out on loan.
 *
 * The reorder list. Nothing in the app previously answered "what has run out?"
 * — a librarian found out when a member asked for a book and there were none.
 */
const getLowStock = async (req, res) => {
    try {
        const settings = await getSettings();
        const requested = Number(req.query.threshold);
        const threshold = Number.isInteger(requested) && requested >= 0
            ? requested
            : settings.low_stock_threshold;

        const { data, error } = await supabase
            .from('books')
            .select('*')
            .lte('available_quantity', threshold)
            .order('available_quantity', { ascending: true });

        if (error) return res.status(400).json({ error: error.message });

        // A withdrawn title having no copies available is the point of
        // withdrawing it, not something to reorder.
        const books = (data || []).filter(isInCirculation).map((b) => ({
            ...b,
            // The difference matters to whoever acts on this: "all 4 copies are
            // out on loan" is a popularity problem, "we own 0" is a purchasing
            // one, and they have opposite fixes.
            onLoan: (b.quantity || 0) - (b.available_quantity || 0),
            outOfStock: (b.available_quantity || 0) === 0,
        }));

        res.status(200).json({ threshold, books });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/books/genres — every genre in the catalog with its book count.
// Counted in JS rather than SQL because supabase-js has no GROUP BY; if the
// catalog grows past the 1000-row default page this needs a Postgres RPC.
const getGenres = async (req, res) => {
    try {
        const { data, error } = await supabase.from('books').select('genre');

        if (error) return res.status(400).json({ error: error.message });

        const counts = {};
        (data || []).forEach((b) => {
            if (!b.genre) return; // genre is nullable — skip unclassified books
            counts[b.genre] = (counts[b.genre] || 0) + 1;
        });

        const result = Object.entries(counts)
            .map(([genre, count]) => ({ genre, count }))
            .sort((a, b) => a.genre.localeCompare(b.genre));

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/books/popular — the 5 most-borrowed titles, all time.
// Counted in JS for the same reason as getGenres (no GROUP BY in supabase-js).
const getPopularBooks = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('borrow_records')
            .select('book_id, books(id, title, author, genre, available_quantity)');

        if (error) return res.status(400).json({ error: error.message });

        const counts = {};
        const bookData = {};
        (data || []).forEach((r) => {
            if (!r.books) return; // book deleted out from under the loan record
            counts[r.book_id] = (counts[r.book_id] || 0) + 1;
            bookData[r.book_id] = r.books;
        });

        const top5 = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => ({ ...bookData[id], borrow_count: count }));

        res.status(200).json(top5);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('books').select('*').eq('id', id).single();

        if (error) return res.status(400).json({ error: error.message });
        if (!data) return res.status(404).json({ message: 'Book not found' });

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/books/:id/detail
 * Staff. The catalogue row plus who is holding copies right now and what has
 * happened to it before.
 *
 * Members get a book detail page; staff had nothing equivalent, so the only
 * way to edit a title was a modal launched from a table row and there was no
 * way at all to see which member had a copy.
 */
const getBookDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: book, error: bookError } = await supabase
            .from('books')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (bookError) return res.status(400).json({ error: bookError.message });
        if (!book) return res.status(404).json({ error: 'Book not found' });

        const [openResult, historyResult] = await Promise.all([
            supabase
                .from('borrow_records')
                .select('*, users!borrow_records_user_id_fkey(id, full_name, email, phone)')
                .eq('book_id', id)
                .in('status', ['active', 'overdue'])
                .order('due_date', { ascending: true }),
            supabase
                .from('borrow_records')
                .select('*, users!borrow_records_user_id_fkey(id, full_name, email)')
                .eq('book_id', id)
                .eq('status', 'returned')
                .order('return_date', { ascending: false })
                .limit(25),
        ]);

        if (openResult.error) throw openResult.error;
        if (historyResult.error) throw historyResult.error;

        const openLoans = openResult.data || [];
        const history = historyResult.data || [];
        const today = new Date().toISOString().slice(0, 10);

        return res.status(200).json({
            book,
            // Who physically has the copies. This is the question a librarian
            // asks when a member wants a title that shows 0 available.
            currentHolders: openLoans,
            history,
            summary: {
                onLoan: openLoans.length,
                overdue: openLoans.filter(
                    (l) => l.status === 'overdue' || (l.due_date && String(l.due_date).slice(0, 10) < today)
                ).length,
                timesBorrowed: openLoans.length + history.length,
                inCirculation: isInCirculation(book),
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createBook = async (req, res) => {
    try {
        const { patch, error: patchError } = buildBookPatch(req.body);
        if (patchError) return res.status(400).json({ error: patchError });

        // Required by the schema, and a clearer message than Postgres gives.
        if (!patch.title || !patch.author) {
            return res.status(400).json({ error: 'Title and author are required.' });
        }

        // FR-08: record which member of staff added the record. Taken from the
        // verified token, never from the body.
        const { data, error } = await supabase
            .from('books')
            .insert([{ ...patch, added_by: req.user.id }])
            .select();

        if (error) return res.status(400).json({ error: error.message });

        await logAudit(req, {
            action: AUDIT_ACTIONS.BOOK_CREATED,
            entityType: ENTITY_TYPES.BOOK,
            entityId: data[0].id,
            entityLabel: data[0].title,
            details: { author: data[0].author, isbn: data[0].isbn, quantity: data[0].quantity },
        });

        res.status(201).json({ message: 'Book created successfully', book: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { patch, error: patchError } = buildBookPatch(req.body);
        if (patchError) return res.status(400).json({ error: patchError });

        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ error: 'Nothing to update.' });
        }

        const { data, error } = await supabase.from('books').update(patch).eq('id', id).select();

        if (error) return res.status(400).json({ error: error.message });
        if (!data || data.length === 0) return res.status(404).json({ error: 'Book not found' });

        await logAudit(req, {
            action: AUDIT_ACTIONS.BOOK_UPDATED,
            entityType: ENTITY_TYPES.BOOK,
            entityId: id,
            entityLabel: data[0].title,
            // The fields touched, not their values: an edit that corrects a
            // typo and one that halves the copy count read very differently.
            details: { changed: patch },
        });

        res.status(200).json({ message: 'Book updated successfully', book: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * PUT /api/books/:id/withdraw
 * Staff. Takes a title out of circulation without destroying anything.
 *
 * This is what a librarian uses instead of DELETE. The catalogue row, its loan
 * history and any fines raised against it all survive; the title simply stops
 * appearing in the member-facing catalogue and cannot be borrowed.
 */
const withdrawBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};

        const { data: book, error: readError } = await supabase
            .from('books')
            .select('id, title, author, withdrawn_at')
            .eq('id', id)
            .maybeSingle();

        if (readError) return res.status(400).json({ error: readError.message });
        if (!book) return res.status(404).json({ error: 'Book not found' });
        if (book.withdrawn_at) {
            return res.status(400).json({ error: 'This title is already out of circulation.' });
        }

        // Copies still out are the reason to keep the record, not a reason to
        // refuse: the loans must still be returnable. Warn, don't block.
        const { count: onLoan } = await supabase
            .from('borrow_records')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', id)
            .in('status', ['active', 'overdue']);

        const { data, error } = await supabase
            .from('books')
            .update({ withdrawn_at: new Date().toISOString(), withdrawn_by: req.user.id })
            .eq('id', id)
            .select('*')
            .maybeSingle();

        if (error) {
            // The column arrives with the governance migration. Say so plainly
            // rather than passing on PostgREST's "column does not exist".
            if (error.code === '42703') {
                return res.status(503).json({
                    error: 'Withdrawal is not set up yet. Run the governance migration first.',
                });
            }
            return res.status(400).json({ error: error.message });
        }

        await logAudit(req, {
            action: AUDIT_ACTIONS.BOOK_WITHDRAWN,
            entityType: ENTITY_TYPES.BOOK,
            entityId: id,
            entityLabel: book.title,
            details: { author: book.author, reason: reason || null, copiesStillOnLoan: onLoan || 0 },
        });

        res.status(200).json({
            message: `“${book.title}” is out of circulation.`,
            book: data,
            copiesStillOnLoan: onLoan || 0,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/** PUT /api/books/:id/restore — the counterpart, or a withdrawal is permanent. */
const restoreBook = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('books')
            .update({ withdrawn_at: null, withdrawn_by: null })
            .eq('id', id)
            .select('*')
            .maybeSingle();

        if (error) return res.status(400).json({ error: error.message });
        if (!data) return res.status(404).json({ error: 'Book not found' });

        await logAudit(req, {
            action: AUDIT_ACTIONS.BOOK_RESTORED,
            entityType: ENTITY_TYPES.BOOK,
            entityId: id,
            entityLabel: data.title,
            details: { author: data.author },
        });

        res.status(200).json({ message: `“${data.title}” is back in circulation.`, book: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * DELETE /api/books/:id
 * Admin only (see bookRoutes).
 *
 * Librarians used to have this, which was the most destructive action anyone
 * in the system could take and sat on a Remove button in a table row. They
 * withdraw instead.
 *
 * Even for an administrator this refuses a title with loan history:
 * borrow_records references books ON DELETE RESTRICT, so Postgres would reject
 * it anyway — but as an opaque foreign-key error rather than an explanation.
 */
const deleteBook = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: book, error: readError } = await supabase
            .from('books')
            .select('id, title, author, isbn')
            .eq('id', id)
            .maybeSingle();

        if (readError) return res.status(400).json({ error: readError.message });
        if (!book) return res.status(404).json({ error: 'Book not found' });

        const { count: loanCount, error: countError } = await supabase
            .from('borrow_records')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', id);

        if (countError) return res.status(400).json({ error: countError.message });

        if (loanCount > 0) {
            return res.status(409).json({
                error:
                    `“${book.title}” has ${loanCount} loan record(s) and cannot be deleted — ` +
                    'that history is the library\'s record of who borrowed what. Withdraw it from ' +
                    'circulation instead.',
            });
        }

        const { error } = await supabase.from('books').delete().eq('id', id);

        if (error) return res.status(400).json({ error: error.message });

        await logAudit(req, {
            action: AUDIT_ACTIONS.BOOK_DELETED,
            entityType: ENTITY_TYPES.BOOK,
            entityId: id,
            // Captured now: after the row is gone this label is the only record
            // of what was actually deleted.
            entityLabel: book.title,
            details: { author: book.author, isbn: book.isbn },
        });

        res.status(200).json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/books/import
 * Body: { books: [{ title, author, isbn?, genre?, quantity? }, …] }
 * Staff.
 *
 * Adding titles one form at a time makes seeding a real catalogue impractical.
 * The frontend parses the CSV and posts rows; this validates each one.
 *
 * Rows are inserted individually rather than as one batch so that a single bad
 * row — a duplicate ISBN, a missing author — reports itself and the other 199
 * still land. A batch insert would roll all of them back and report one error.
 */
const MAX_IMPORT_ROWS = 500;

const importBooks = async (req, res) => {
    try {
        const rows = req.body?.books;

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'Provide a non-empty "books" array.' });
        }
        if (rows.length > MAX_IMPORT_ROWS) {
            return res.status(400).json({
                error: `Import is limited to ${MAX_IMPORT_ROWS} rows at a time. Split the file.`,
            });
        }

        const imported = [];
        const failed = [];

        for (let i = 0; i < rows.length; i += 1) {
            // Row number as the person sees it in their spreadsheet: 1-indexed,
            // plus one for the header line.
            const line = i + 2;
            const { patch, error: patchError } = buildBookPatch(rows[i]);

            if (patchError) {
                failed.push({ line, title: rows[i]?.title || '—', reason: patchError });
                continue;
            }
            if (!patch.title || !patch.author) {
                failed.push({ line, title: patch.title || '—', reason: 'Title and author are required.' });
                continue;
            }

            // A CSV rarely carries available_quantity, and a title imported as
            // "3 copies, 0 available" would be invisible to every member.
            if (patch.available_quantity === undefined) {
                patch.available_quantity = patch.quantity ?? 1;
            }

            const { data, error } = await supabase
                .from('books')
                .insert([{ ...patch, added_by: req.user.id }])
                .select('id, title, author, isbn')
                .maybeSingle();

            if (error) {
                failed.push({
                    line,
                    title: patch.title,
                    reason: error.code === '23505'
                        ? `A book with ISBN ${patch.isbn} is already in the catalogue.`
                        : error.message,
                });
                continue;
            }

            imported.push(data);
        }

        if (imported.length > 0) {
            // One entry for the import, not one per book: a 200-row file would
            // otherwise bury every other action in the log for that day.
            await logAudit(req, {
                action: AUDIT_ACTIONS.BOOK_IMPORTED,
                entityType: ENTITY_TYPES.BOOK,
                entityLabel: `${imported.length} title(s) imported`,
                details: {
                    imported: imported.length,
                    failed: failed.length,
                    titles: imported.slice(0, 20).map((b) => b.title),
                },
            });
        }

        res.status(imported.length > 0 ? 201 : 400).json({
            success: imported.length > 0,
            importedCount: imported.length,
            failedCount: failed.length,
            imported,
            failed,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getBooks,
    getGenres,
    getPopularBooks,
    getLowStock,
    getBookById,
    getBookDetail,
    createBook,
    updateBook,
    withdrawBook,
    restoreBook,
    deleteBook,
    importBooks,
};