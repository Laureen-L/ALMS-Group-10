// Admin — Catalog management.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  Bookmark,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilterX,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Select from "../../components/ui/Select.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import { BOOK_STATUS } from "../../constants/bookStatus.js";
import { BORROW_STATUS } from "../../constants/borrowStatus.js";
import "../../styles/globals.css";

const MONO = { fontFamily: "monospace", fontSize: 13 };
const PAGE_SIZE = 4;

const GENRE_FILTER_OPTIONS = [
  "All Genres",
  "Science",
  "Engineering",
  "Mathematics",
  "Literature",
  "Computer Science",
  "Physics",
];

const GENRE_FORM_OPTIONS = GENRE_FILTER_OPTIONS.filter((g) => g !== "All Genres");

const AVAILABILITY_FILTER_OPTIONS = [
  "All Availability",
  "Available",
  "Borrowed",
  "Reserved",
  "Overdue",
];

const AVAILABILITY_FORM_OPTIONS = AVAILABILITY_FILTER_OPTIONS.filter(
  (a) => a !== "All Availability",
);

const EMPTY_FORM = {
  title: "",
  author: "",
  isbn: "",
  genre: "Mathematics",
  copies: "1",
  available: "1",
  availability: "Available",
  overdueCount: "",
};

const INITIAL_BOOKS = [
  {
    id: 1,
    title: "Advanced Engineering Mathematics",
    author: "Erwin Kreyszig",
    isbn: "978-0470458365",
    genre: "Mathematics",
    copies: 15,
    available: 12,
    availability: "Available",
    status: BOOK_STATUS.AVAILABLE,
  },
  {
    id: 2,
    title: "Data Structures and Algorithms in Java",
    author: "Robert Lafore",
    isbn: "978-0672324536",
    genre: "Computer Science",
    copies: 8,
    available: 0,
    availability: "Borrowed",
    statusLabel: "Borrowed Out",
    statusTone: "gold",
  },
  {
    id: 3,
    title: "Mechanical Engineering Principles",
    author: "John Bird",
    isbn: "978-1138781573",
    genre: "Engineering",
    copies: 5,
    available: 1,
    availability: "Available",
    status: BOOK_STATUS.AVAILABLE,
  },
  {
    id: 4,
    title: "Introduction to Quantum Mechanics",
    author: "David J. Griffiths",
    isbn: "978-1107189638",
    genre: "Physics",
    copies: 3,
    available: 0,
    availability: "Overdue",
    status: BORROW_STATUS.OVERDUE,
    statusLabel: "Overdue (2)",
    overdueCount: 2,
  },
  {
    id: 5,
    title: "Organic Chemistry",
    author: "Paula Yurkanis Bruice",
    isbn: "978-0134042283",
    genre: "Science",
    copies: 10,
    available: 7,
    availability: "Available",
    status: BOOK_STATUS.AVAILABLE,
  },
  {
    id: 6,
    title: "Pride and Prejudice",
    author: "Jane Austen",
    isbn: "978-0141439518",
    genre: "Literature",
    copies: 6,
    available: 0,
    availability: "Reserved",
    statusLabel: "Reserved",
    statusTone: "amber",
  },
  {
    id: 7,
    title: "Calculus: Early Transcendentals",
    author: "James Stewart",
    isbn: "978-1285741550",
    genre: "Mathematics",
    copies: 12,
    available: 9,
    availability: "Available",
    status: BOOK_STATUS.AVAILABLE,
  },
  {
    id: 8,
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    genre: "Computer Science",
    copies: 4,
    available: 0,
    availability: "Borrowed",
    statusLabel: "Borrowed Out",
    statusTone: "gold",
  },
];

function formatCount(value) {
  return value.toLocaleString();
}

function enrichBook(raw) {
  const copies = Math.max(0, Number(raw.copies) || 0);
  const available = Math.min(Math.max(0, Number(raw.available) || 0), copies);
  const availability = raw.availability || (available > 0 ? "Available" : "Borrowed");
  const overdueCount = Number(raw.overdueCount) || 0;

  const book = {
    id: raw.id,
    title: raw.title.trim(),
    author: raw.author.trim(),
    isbn: raw.isbn.trim(),
    genre: raw.genre,
    copies,
    available,
    availability,
  };

  if (availability === "Available") {
    book.status = BOOK_STATUS.AVAILABLE;
  } else if (availability === "Overdue") {
    book.status = BORROW_STATUS.OVERDUE;
    book.overdueCount = overdueCount || 1;
    book.statusLabel = `Overdue (${book.overdueCount})`;
  } else if (availability === "Borrowed") {
    book.statusLabel = "Borrowed Out";
    book.statusTone = "gold";
  } else if (availability === "Reserved") {
    book.statusLabel = "Reserved";
    book.statusTone = "amber";
  }

  return book;
}

function buildStats(books) {
  const totalAvailable = books.reduce((sum, book) => sum + book.available, 0);
  const borrowed = books.filter((book) => book.availability === "Borrowed").length;
  const overdue = books.filter((book) => book.availability === "Overdue").length;

  return [
    {
      tone: "neutral",
      eyebrow: "Total Books",
      value: formatCount(books.length),
      label: "In catalog",
      icon: BookOpen,
    },
    {
      tone: "active",
      eyebrow: "Available",
      value: formatCount(totalAvailable),
      label: "Ready to borrow",
      icon: CheckCircle,
    },
    {
      tone: "warning",
      eyebrow: "Currently Borrowed",
      value: formatCount(borrowed),
      label: "Checked out",
      icon: Bookmark,
    },
    {
      tone: "critical",
      eyebrow: "Overdue Returns",
      value: formatCount(overdue),
      label: "Needs attention",
      icon: AlertTriangle,
    },
  ];
}

function renderAvailabilityStatus(row) {
  if (row.statusLabel) {
    return <Badge tone={row.statusTone || "neutral"}>{row.statusLabel}</Badge>;
  }
  if (row.status === BOOK_STATUS.AVAILABLE) {
    return <Badge tone="green">Available</Badge>;
  }
  if (row.status === BORROW_STATUS.OVERDUE) {
    return <Badge tone="red">{row.statusLabel || "Overdue"}</Badge>;
  }
  return <Badge tone="neutral">{row.availability}</Badge>;
}

function getVisiblePages(current, total) {
  if (total <= 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("ellipsis-start");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push("ellipsis-end");
  pages.push(total);

  return pages;
}

function bookToForm(book) {
  return {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    genre: book.genre,
    copies: String(book.copies),
    available: String(book.available),
    availability: book.availability,
    overdueCount: book.overdueCount ? String(book.overdueCount) : "",
  };
}

export default function AdminCatalogPage() {
  const [books, setBooks] = useState(INITIAL_BOOKS);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("All Genres");
  const [availabilityFilter, setAvailabilityFilter] = useState("All Availability");
  const [page, setPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setPage(1);
  }, [search, genreFilter, availabilityFilter]);

  const stats = useMemo(() => buildStats(books), [books]);

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return books.filter((book) => {
      const matchesSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query);
      const matchesGenre =
        genreFilter === "All Genres" || book.genre === genreFilter;
      const matchesAvailability =
        availabilityFilter === "All Availability" ||
        book.availability === availabilityFilter;
      return matchesSearch && matchesGenre && matchesAvailability;
    });
  }, [books, search, genreFilter, availabilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedBooks = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredBooks.slice(start, start + PAGE_SIZE);
  }, [filteredBooks, safePage]);

  const pageStart = filteredBooks.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredBooks.length);
  const visiblePages = getVisiblePages(safePage, totalPages);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = "Title is required.";
    if (!form.author.trim()) errors.author = "Author is required.";
    if (!form.isbn.trim()) errors.isbn = "ISBN is required.";

    const copies = Number(form.copies);
    const available = Number(form.available);
    if (Number.isNaN(copies) || copies < 0) {
      errors.copies = "Enter a valid copy count.";
    }
    if (Number.isNaN(available) || available < 0) {
      errors.available = "Enter a valid available count.";
    }
    if (!Number.isNaN(copies) && !Number.isNaN(available) && available > copies) {
      errors.available = "Available cannot exceed total copies.";
    }
    if (
      form.availability === "Overdue" &&
      form.overdueCount &&
      (Number.isNaN(Number(form.overdueCount)) || Number(form.overdueCount) < 1)
    ) {
      errors.overdueCount = "Enter a valid overdue count.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (book) => {
    setSelectedBook(book);
    setForm(bookToForm(book));
    setFormErrors({});
    setShowEditModal(true);
  };

  const openViewModal = (book) => {
    setSelectedBook(book);
    setShowViewModal(true);
  };

  const handleAddBook = () => {
    if (!validateForm()) return;

    const nextId = books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
    const newBook = enrichBook({ id: nextId, ...form });
    setBooks((prev) => {
      const next = [...prev, newBook];
      setPage(Math.ceil(next.length / PAGE_SIZE));
      return next;
    });
    setNotice(`"${newBook.title}" was added to the catalog.`);
    setShowAddModal(false);
    resetForm();
  };

  const handleEditBook = () => {
    if (!validateForm() || !selectedBook) return;

    const updated = enrichBook({ id: selectedBook.id, ...form });
    setBooks((prev) =>
      prev.map((book) => (book.id === selectedBook.id ? updated : book)),
    );
    setNotice(`"${updated.title}" was updated successfully.`);
    setShowEditModal(false);
    setSelectedBook(null);
    resetForm();
  };

  const clearFilters = () => {
    setSearch("");
    setGenreFilter("All Genres");
    setAvailabilityFilter("All Availability");
    setPage(1);
  };

  const bookColumns = useMemo(
    () => [
      {
        key: "title",
        header: "Title & Author",
        render: (row) => (
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{row.title}</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              {row.author}
            </p>
          </div>
        ),
      },
      {
        key: "isbn",
        header: "ISBN",
        render: (row) => (
          <span style={{ ...MONO, color: "var(--muted)" }}>{row.isbn}</span>
        ),
      },
      {
        key: "genre",
        header: "Genre",
        render: (row) => <Badge tone="neutral">{row.genre}</Badge>,
      },
      {
        key: "copies",
        header: "Copies",
        render: (row) => (
          <span style={{ ...MONO, display: "block", textAlign: "right" }}>
            {row.copies}
          </span>
        ),
      },
      {
        key: "available",
        header: "Available",
        render: (row) => (
          <span style={{ ...MONO, display: "block", textAlign: "right" }}>
            {row.available}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <div style={{ textAlign: "center" }}>{renderAvailabilityStatus(row)}</div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`View ${row.title}`}
              onClick={() => openViewModal(row)}
            >
              <Eye size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Edit ${row.title}`}
              onClick={() => openEditModal(row)}
            >
              <Pencil size={14} />
            </Button>
          </div>
        ),
      },
    ],
    [openEditModal, openViewModal],
  );

  const bookFormFields = (
    <div className="stack" style={{ gap: 16 }}>
      <Input
        label="Title"
        id="book-title"
        value={form.title}
        onChange={(e) => updateForm("title", e.target.value)}
        error={formErrors.title}
      />
      <Input
        label="Author"
        id="book-author"
        value={form.author}
        onChange={(e) => updateForm("author", e.target.value)}
        error={formErrors.author}
      />
      <Input
        label="ISBN"
        id="book-isbn"
        value={form.isbn}
        onChange={(e) => updateForm("isbn", e.target.value)}
        error={formErrors.isbn}
      />
      <Select
        label="Genre"
        id="book-genre"
        options={GENRE_FORM_OPTIONS}
        value={form.genre}
        onChange={(e) => updateForm("genre", e.target.value)}
      />
      <div className="row" style={{ alignItems: "flex-start" }}>
        <Input
          label="Total Copies"
          id="book-copies"
          type="number"
          min="0"
          value={form.copies}
          onChange={(e) => updateForm("copies", e.target.value)}
          error={formErrors.copies}
          style={{ flex: 1 }}
        />
        <Input
          label="Available Copies"
          id="book-available"
          type="number"
          min="0"
          value={form.available}
          onChange={(e) => updateForm("available", e.target.value)}
          error={formErrors.available}
          style={{ flex: 1 }}
        />
      </div>
      <Select
        label="Availability Status"
        id="book-availability"
        options={AVAILABILITY_FORM_OPTIONS}
        value={form.availability}
        onChange={(e) => updateForm("availability", e.target.value)}
      />
      {form.availability === "Overdue" && (
        <Input
          label="Overdue Count"
          id="book-overdue-count"
          type="number"
          min="1"
          value={form.overdueCount}
          onChange={(e) => updateForm("overdueCount", e.target.value)}
          error={formErrors.overdueCount}
        />
      )}
    </div>
  );

  return (
    <div className="stack">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link to="/admin/dashboard">Home</Link>
        <span className="crumb__sep">/</span>
        <span className="crumb__current">Catalog</span>
      </nav>

      <header className="row row--between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Catalog</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Manage and browse the full book inventory.
          </p>
        </div>
        <Button variant="gold" onClick={openAddModal}>
          <Plus size={18} />
          Add New Book
        </Button>
      </header>

      {notice && <AlertBanner tone="info" message={notice} />}

      <section className="grid-stats">
        {stats.map((stat) => (
          <StatCard key={stat.eyebrow} {...stat} />
        ))}
      </section>

      <div
        className="row"
        style={{
          flexWrap: "wrap",
          gap: 16,
          padding: 16,
          background: "var(--surface)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius)",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
          <input
            className="input"
            type="search"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <Select
          label="Genre"
          options={GENRE_FILTER_OPTIONS}
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          style={{ width: 160 }}
        />
        <Select
          label="Availability"
          options={AVAILABILITY_FILTER_OPTIONS}
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          style={{ width: 180 }}
        />
        <Button variant="ghost" onClick={clearFilters}>
          <FilterX size={16} />
          Clear Filters
        </Button>
      </div>

      <Card>
        <DataTable
          columns={bookColumns}
          rows={paginatedBooks}
          rowKey="id"
          emptyMessage="No books match your filters."
        />
        <div className="row row--between" style={{ paddingTop: 14, flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {filteredBooks.length === 0
              ? "No results"
              : `Showing ${pageStart}–${pageEnd} of ${formatCount(filteredBooks.length)} results`}
          </span>
          <div className="pager" style={{ paddingTop: 0 }}>
            <button
              type="button"
              className="pager__btn"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {visiblePages.map((pageNumber) =>
              typeof pageNumber === "string" ? (
                <span
                  key={pageNumber}
                  style={{ color: "var(--muted)", padding: "0 4px" }}
                >
                  …
                </span>
              ) : (
                <button
                  key={pageNumber}
                  type="button"
                  className={[
                    "pager__btn",
                    pageNumber === safePage && "pager__btn--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setPage(pageNumber)}
                  aria-label={`Page ${pageNumber}`}
                  aria-current={pageNumber === safePage ? "page" : undefined}
                >
                  {pageNumber}
                </button>
              ),
            )}
            <button
              type="button"
              className="pager__btn"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>

      {showAddModal && (
        <Modal
          title="Add New Book"
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button variant="gold" onClick={handleAddBook}>
                Add Book
              </Button>
            </>
          }
        >
          {bookFormFields}
        </Modal>
      )}

      {showEditModal && selectedBook && (
        <Modal
          title="Edit Book"
          onClose={() => {
            setShowEditModal(false);
            setSelectedBook(null);
            resetForm();
          }}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedBook(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button variant="gold" onClick={handleEditBook}>
                Save Changes
              </Button>
            </>
          }
        >
          {bookFormFields}
        </Modal>
      )}

      {showViewModal && selectedBook && (
        <Modal
          title="Book Details"
          onClose={() => {
            setShowViewModal(false);
            setSelectedBook(null);
          }}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedBook(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="gold"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(selectedBook);
                }}
              >
                <Pencil size={14} />
                Edit Book
              </Button>
            </>
          }
        >
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <p className="field__label">Title</p>
              <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{selectedBook.title}</p>
            </div>
            <div>
              <p className="field__label">Author</p>
              <p style={{ margin: "4px 0 0" }}>{selectedBook.author}</p>
            </div>
            <div>
              <p className="field__label">ISBN</p>
              <p style={{ margin: "4px 0 0", ...MONO }}>{selectedBook.isbn}</p>
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 24 }}>
              <div>
                <p className="field__label">Genre</p>
                <p style={{ margin: "4px 0 0" }}>{selectedBook.genre}</p>
              </div>
              <div>
                <p className="field__label">Copies</p>
                <p style={{ margin: "4px 0 0", ...MONO }}>{selectedBook.copies}</p>
              </div>
              <div>
                <p className="field__label">Available</p>
                <p style={{ margin: "4px 0 0", ...MONO }}>{selectedBook.available}</p>
              </div>
            </div>
            <div>
              <p className="field__label">Status</p>
              <div style={{ marginTop: 6 }}>{renderAvailabilityStatus(selectedBook)}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
