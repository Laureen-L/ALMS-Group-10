// Skeleton — placeholder blocks shown while data loads. Preferred over a bare
// spinner because the page keeps its shape, so nothing jumps when data lands.
export function SkeletonRows({ rows = 5 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="skeleton skeleton-row"
          // Ragged widths read as text; identical bars read as a loading bug.
          style={{ width: `${[92, 78, 85, 70, 88, 74][i % 6]}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div className="book-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

export default SkeletonRows;
