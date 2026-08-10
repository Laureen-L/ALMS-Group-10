// BookTile — the compact clickable book card used by Popular Picks and
// My Favorites. Keeps those two grids from re-implementing the same markup.
import { BookOpen } from "lucide-react";
import Badge from "../ui/Badge.jsx";

export default function BookTile({ book, onOpen, footer }) {
  return (
    <div
      className="book-card"
      role="button"
      tabIndex={0}
      style={{ cursor: "pointer" }}
      onClick={() => onOpen(book)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(book); }}
    >
      <div className="book-card__cover"><BookOpen size={22} /></div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Badge tone="green">{book.genre || "Book"}</Badge>
        <span className="book-card__title" style={{ marginTop: 8 }}>{book.title}</span>
        <div className="book-card__author">By {book.author}</div>
        {footer && <div style={{ marginTop: "auto", fontSize: 13 }}>{footer}</div>}
      </div>
    </div>
  );
}
