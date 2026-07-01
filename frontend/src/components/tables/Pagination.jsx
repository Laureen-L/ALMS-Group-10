// Pagination — simple page switcher. page is 1-indexed.
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="pager">
      <button className="pager__btn" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={16} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={["pager__btn", p === page && "pager__btn--active"].filter(Boolean).join(" ")}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button className="pager__btn" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
