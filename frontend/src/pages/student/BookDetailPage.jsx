// SCREEN 2 — Book Detail.
// Cover + Reserve/Favorite, metadata, availability (floor/aisle/shelf),
// about, table of contents, additional details, library news, similar books.
// Reads :bookId from the URL. MOCK book for now; wire to bookService.getBook(id).
import { useParams, Link } from "react-router-dom";
import { BookOpen, MapPin, Bookmark, Heart } from "lucide-react";
import Breadcrumb from "../../components/ui/Breadcrumb.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import RatingStars from "../../components/ui/RatingStars.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";

// MOCK — replace with bookService.getBook(bookId)
const BOOK = {
  title: "Principles of Structural Engineering",
  authors: "Dr. Kwame Mensah & Prof. Elena Rossi",
  genre: "Civil Engineering",
  rating: 4.8, reviews: 124,
  isbn: "978-0134438498", published: "2023 (4th Edition)", language: "English", pages: "842 Pages",
  available: true, location: "Main Library Center · Engineering Wing",
  floor: "Level 3", aisle: "A-12", shelf: "402",
  about: [
    "This comprehensive textbook provides a rigorous introduction to the core principles of structural engineering, bridging the gap between theoretical mechanics and practical design. It covers load analysis, material properties, and the behavior of steel, concrete, and timber structures.",
    "The fourth edition adds the latest international building codes and new case studies on sustainable infrastructure and seismic-resistant design — an essential resource for senior undergraduates and practicing engineers alike.",
  ],
  toc: [
    { title: "Chapter 1: Introduction to Structural Systems", page: "01" },
    { title: "Chapter 2: Analysis of Statically Determinate Trusses", page: "45" },
    { title: "Chapter 3: Deflections of Beams and Frames", page: "112" },
    { title: "Chapter 4: Matrix Stiffness Method", page: "238" },
    { title: "Chapter 5: Reinforced Concrete Design Fundamentals", page: "367" },
  ],
  details: {
    Edition: "International Student Edition",
    Publisher: "Pearson Higher Education",
    Format: "Hardcover, Glossy Finish",
    Dimensions: "21.6 x 4.4 x 27.9 cm",
    "Department Tag": "KNUST Engineering Archive",
  },
};

const SIMILAR = [
  { id: 10, title: "Mechanics of Materials", author: "Ferdinand P. Beer", available: true },
  { id: 11, title: "Modern Steel Design", author: "William T. Segui", available: true },
  { id: 12, title: "Advanced Fluid Mechanics", author: "Pijush K. Kundu", available: false },
];

export default function BookDetailPage() {
  const { bookId } = useParams();
  const book = BOOK; // TODO: fetch by bookId

  return (
    <div>
      <Breadcrumb items={[
        { label: "Home", to: "/student/dashboard" },
        { label: "Catalog", to: "/student/search" },
        { label: book.title },
      ]} />

      <div className="detail-grid" style={{ marginTop: 18 }}>
        {/* Left: cover + actions */}
        <div>
          <div className="detail-cover"><span>{book.title.toUpperCase()}</span></div>
          <div className="stack" style={{ gap: 10, marginTop: 14 }}>
            <Button variant="green" block><Bookmark size={16} /> Reserve Book</Button>
            <Button variant="outline" block><Heart size={16} /> Add to Favorites</Button>
          </div>
        </div>

        {/* Right: info */}
        <div>
          <div className="row row--between" style={{ alignItems: "flex-start" }}>
            <Badge tone="green">{book.genre}</Badge>
            <RatingStars value={book.rating} count={book.reviews} />
          </div>
          <h1 className="detail-title">{book.title}</h1>
          <p className="detail-authors">{book.authors}</p>

          <dl className="meta-grid">
            <div><dt>ISBN-13</dt><dd>{book.isbn}</dd></div>
            <div><dt>Publication</dt><dd>{book.published}</dd></div>
            <div><dt>Language</dt><dd>{book.language}</dd></div>
            <div><dt>Pages</dt><dd>{book.pages}</dd></div>
          </dl>

          <div className="avail-card">
            <MapPin size={22} color="var(--green-700)" />
            <div className="avail-card__loc">
              <div><span className="avail-card__dot">●</span> Currently {book.available ? "Available" : "On Loan"}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{book.location}</div>
            </div>
            <div className="avail-shelf"><dt>Floor</dt><dd>{book.floor}</dd></div>
            <div className="avail-shelf"><dt>Aisle</dt><dd>{book.aisle}</dd></div>
            <div className="avail-shelf"><dt>Shelf</dt><dd>{book.shelf}</dd></div>
          </div>
        </div>
      </div>

      {/* Lower content: about + toc (left), details + news (right) */}
      <div className="detail-grid" style={{ gridTemplateColumns: "1fr 320px", marginTop: 26 }}>
        <div className="stack" style={{ gap: 22 }}>
          <Card title="About this Book">
            {book.about.map((p, i) => (
              <p key={i} style={{ color: "var(--ink)", marginBottom: 12, lineHeight: 1.6 }}>{p}</p>
            ))}
          </Card>

          <Card title="Table of Contents">
            {book.toc.map((c, i) => (
              <div key={i} className="toc-row"><span>{c.title}</span><span>p. {c.page}</span></div>
            ))}
          </Card>
        </div>

        <div>
          <Card title="Additional Details">
            <dl className="detail-side">
              {Object.entries(book.details).map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </Card>

          <div className="news-card">
            <h4>Library News</h4>
            <p>Extended hours for the Engineering Wing start next Monday. Open until 11 PM for mid-term prep.</p>
          </div>
        </div>
      </div>

      {/* Similar books */}
      <h2 className="page-title" style={{ margin: "28px 0 6px" }}>Similar Books</h2>
      <p className="page-sub">More resources from the Engineering Department</p>
      <div className="book-grid">
        {SIMILAR.map((b) => (
          <div key={b.id} className={`book-card ${b.available ? "" : "book-card--borrowed"}`}>
            <div className="book-card__cover"><BookOpen size={22} /></div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <StatusBadge status={b.available ? "available" : "borrowed"} />
              <Link to={`/student/catalog/${b.id}`} className="book-card__title" style={{ marginTop: 8 }}>{b.title}</Link>
              <div className="book-card__author">By {b.author}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}