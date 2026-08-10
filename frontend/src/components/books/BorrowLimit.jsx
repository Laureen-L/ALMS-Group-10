// BorrowLimit — shows how much of the 5-book allowance is used.
// Replaces the old static "Books Allowed: 5" tile, which never reflected
// how many the member actually had out.
export const BORROW_LIMIT = 5;

export default function BorrowLimit({ activeLoans = 0, limit = BORROW_LIMIT }) {
  const atLimit = activeLoans >= limit;
  return (
    <div className={`borrow-limit ${atLimit ? "borrow-limit--full" : "borrow-limit--ok"}`}>
      <h3>Borrow Limit</h3>
      <p className="borrow-limit__count">{activeLoans} / {limit}</p>
      <p className="genre-card__count">books borrowed</p>
      {atLimit && (
        <p className="borrow-limit__warn">⚠ Limit reached — return a book before borrowing another</p>
      )}
    </div>
  );
}
