// RatingStars — read-only star display. value 0–5, optional review count.
import { Star } from "lucide-react";

export default function RatingStars({ value = 0, count }) {
  return (
    <span className="rating">
      <span className="rating__stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={16} fill={n <= Math.round(value) ? "currentColor" : "none"} />
        ))}
      </span>
      {count != null && <span className="rating__count">{value} ({count} reviews)</span>}
    </span>
  );
}
