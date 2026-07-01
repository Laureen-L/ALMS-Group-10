// SCREEN 8 — Reports & Analytics: report generator, KPI cards, charts, detailed table, export.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Download,
  Filter,
  MoreVertical,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Select from "../../components/ui/Select.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import { downloadCsv, printReport, rowsToTableHtml } from "../../utils/export.js";
import "../../styles/globals.css";

const MONO = { fontFamily: "monospace", fontSize: 13 };

const REPORT_PERIODS = ["June 2025", "May 2025", "April 2025", "March 2025"];

const CATEGORY_OPTIONS = ["All Categories", "Engineering", "Computer Science", "Business"];

const STATS = [
  {
    tone: "active",
    eyebrow: "Borrows This Month",
    value: "112",
    label: "+14% vs last month",
    icon: TrendingUp,
  },
  {
    tone: "neutral",
    eyebrow: "Return Rate",
    value: "94%",
    label: "On-time returns",
    icon: CheckCircle,
  },
  {
    tone: "critical",
    eyebrow: "Overdue Rate",
    value: "10.3%",
    label: "+1.2% vs last month",
    icon: AlertTriangle,
  },
  {
    tone: "active",
    eyebrow: "Active Members",
    value: "340",
    label: "Registered users",
    icon: Users,
  },
];

const SECONDARY_STATS = [
  { label: "New Users This Month", value: "34" },
  { label: "Books Added", value: "8" },
  { label: "Avg. Borrow Duration", value: "11 days" },
  { label: "Most Borrowed Category", value: "Engineering" },
];

const TABS = [
  { id: "borrowing", label: "Borrowing Trends" },
  { id: "activity", label: "User Activity" },
  { id: "popularity", label: "Book Popularity" },
];

const BORROWING_TRENDS = [
  {
    id: 1,
    month: "June 2025",
    total: 112,
    returned: 105,
    overdue: 7,
    returnRate: 94,
    rateTone: "green",
  },
  {
    id: 2,
    month: "May 2025",
    total: 133,
    returned: 123,
    overdue: 10,
    returnRate: 92,
    rateTone: "green",
  },
  {
    id: 3,
    month: "April 2025",
    total: 98,
    returned: 86,
    overdue: 12,
    returnRate: 88,
    rateTone: "gold",
  },
  {
    id: 4,
    month: "March 2025",
    total: 105,
    returned: 75,
    overdue: 30,
    returnRate: 71,
    rateTone: "red",
  },
];

const USER_ACTIVITY = [
  {
    id: 1,
    name: "Dr. Kwame Mensah",
    email: "kmensah@knust.edu.gh",
    role: "Faculty",
    total: 24,
    returned: 24,
    overdue: 0,
    compliance: 100,
    complianceTone: "green",
  },
  {
    id: 2,
    name: "Abena Osei",
    email: "aosei.st@knust.edu.gh",
    role: "Student",
    total: 18,
    returned: 15,
    overdue: 3,
    compliance: 83,
    complianceTone: "amber",
  },
  {
    id: 3,
    name: "Prof. Yaa Asantewaa",
    email: "yasantewaa@knust.edu.gh",
    role: "Faculty",
    total: 32,
    returned: 22,
    overdue: 10,
    compliance: 68,
    complianceTone: "red",
  },
];

const BOOK_POPULARITY = [
  {
    id: 1,
    rank: 1,
    title: "Advanced Engineering Mathematics",
    category: "Engineering",
    borrows: 45,
    copies: 3,
    outOfStock: false,
  },
  {
    id: 2,
    rank: 2,
    title: "Introduction to Algorithms",
    category: "Computer Science",
    borrows: 38,
    copies: 0,
    outOfStock: true,
  },
  {
    id: 3,
    rank: 3,
    title: "Principles of Economics",
    category: "Business",
    borrows: 29,
    copies: 5,
    outOfStock: false,
  },
];

const BORROWING_COLUMNS = [
  { key: "month", header: "Month" },
  {
    key: "total",
    header: "Total Borrows",
    render: (row) => (
      <span style={{ ...MONO, fontWeight: 600, color: "var(--green-600)" }}>
        {row.total}
      </span>
    ),
  },
  {
    key: "returned",
    header: "Returned",
    render: (row) => <span style={MONO}>{row.returned}</span>,
  },
  {
    key: "overdue",
    header: "Overdue",
    render: (row) => (
      <span style={{ ...MONO, fontWeight: 600, color: "var(--red-600)" }}>
        {row.overdue}
      </span>
    ),
  },
  {
    key: "returnRate",
    header: "Return Rate",
    render: (row) => <Badge tone={row.rateTone}>{row.returnRate}%</Badge>,
  },
];

const USER_COLUMNS = [
  {
    key: "user",
    header: "User",
    render: (row) => (
      <div>
        <p style={{ margin: 0, fontWeight: 600 }}>{row.name}</p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{row.email}</p>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (row) => <Badge tone="neutral">{row.role}</Badge>,
  },
  {
    key: "total",
    header: "Total Borrows",
    render: (row) => <span style={MONO}>{row.total}</span>,
  },
  {
    key: "returned",
    header: "Returned",
    render: (row) => <span style={MONO}>{row.returned}</span>,
  },
  {
    key: "overdue",
    header: "Overdue",
    render: (row) => (
      <span
        style={{
          ...MONO,
          fontWeight: row.overdue > 0 ? 600 : 400,
          color: row.overdue > 0 ? "var(--red-600)" : "inherit",
        }}
      >
        {row.overdue}
      </span>
    ),
  },
  {
    key: "compliance",
    header: "Compliance",
    render: (row) => <Badge tone={row.complianceTone}>{row.compliance}%</Badge>,
  },
];

const BOOK_COLUMNS = [
  {
    key: "rank",
    header: "Rank",
    render: (row) => (
      <span style={{ ...MONO, color: "var(--muted)" }}>#{row.rank}</span>
    ),
  },
  { key: "title", header: "Book Title" },
  {
    key: "category",
    header: "Category",
    render: (row) => <Badge tone="neutral">{row.category}</Badge>,
  },
  {
    key: "borrows",
    header: "Total Borrows",
    render: (row) => (
      <span style={{ ...MONO, fontWeight: 600, color: "var(--green-600)" }}>
        {row.borrows}
      </span>
    ),
  },
  {
    key: "copies",
    header: "Copies Available",
    render: (row) =>
      row.outOfStock ? (
        <span style={{ ...MONO, fontWeight: 600, color: "var(--red-600)" }}>
          0 <span style={{ fontSize: 12, fontWeight: 400 }}>(Out of Stock)</span>
        </span>
      ) : (
        <span style={MONO}>{row.copies}</span>
      ),
  },
];

function getTabExport(activeTab, rows) {
  if (activeTab === "borrowing") {
    return {
      title: "Monthly Borrowing Trends",
      filename: "borrowing-trends.csv",
      headers: ["Month", "Total Borrows", "Returned", "Overdue", "Return Rate"],
      data: rows.map((row) => [
        row.month,
        row.total,
        row.returned,
        row.overdue,
        `${row.returnRate}%`,
      ]),
    };
  }

  if (activeTab === "activity") {
    return {
      title: "User Activity Breakdown",
      filename: "user-activity.csv",
      headers: ["User", "Email", "Role", "Total Borrows", "Returned", "Overdue", "Compliance"],
      data: rows.map((row) => [
        row.name,
        row.email,
        row.role,
        row.total,
        row.returned,
        row.overdue,
        `${row.compliance}%`,
      ]),
    };
  }

  return {
    title: "Most Borrowed Books",
    filename: "book-popularity.csv",
    headers: ["Rank", "Book Title", "Category", "Total Borrows", "Copies Available"],
    data: rows.map((row) => [
      row.rank,
      row.title,
      row.category,
      row.borrows,
      row.outOfStock ? "0 (Out of Stock)" : row.copies,
    ]),
  };
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("borrowing");
  const [reportPeriod, setReportPeriod] = useState("June 2025");
  const [userSearch, setUserSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const filteredTrends = useMemo(
    () => BORROWING_TRENDS.filter((row) => row.month === reportPeriod),
    [reportPeriod],
  );

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return USER_ACTIVITY;
    return USER_ACTIVITY.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }, [userSearch]);

  const filteredBooks = useMemo(() => {
    if (categoryFilter === "All Categories") return BOOK_POPULARITY;
    return BOOK_POPULARITY.filter((book) => book.category === categoryFilter);
  }, [categoryFilter]);

  const activeRows =
    activeTab === "borrowing"
      ? filteredTrends
      : activeTab === "activity"
        ? filteredUsers
        : filteredBooks;

  const outOfStockCount = filteredBooks.filter((book) => book.outOfStock).length;
  const topCategory =
    filteredBooks.length > 0
      ? filteredBooks.reduce((best, book) => (book.borrows > best.borrows ? book : best)).category
      : "—";

  useEffect(() => {
    setMenuOpen(false);
    setFilterOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportCsv = () => {
    const { filename, headers, data } = getTabExport(activeTab, activeRows);
    downloadCsv(filename, headers, data);
    setMenuOpen(false);
  };

  const handleExportPdf = () => {
    const { title, headers, data } = getTabExport(activeTab, activeRows);
    printReport(`${title} — ${reportPeriod}`, rowsToTableHtml(headers, data));
  };

  const clearBookFilter = () => {
    setCategoryFilter("All Categories");
    setFilterOpen(false);
  };

  const exportMenu = (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-label="More options"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreVertical size={18} />
      </button>
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 4,
            minWidth: 160,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow)",
            zIndex: 10,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--block"
            style={{ justifyContent: "flex-start", borderRadius: 0 }}
            onClick={handleExportCsv}
            disabled={activeRows.length === 0}
          >
            Export as CSV
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--block"
            style={{ justifyContent: "flex-start", borderRadius: 0 }}
            onClick={handleExportPdf}
            disabled={activeRows.length === 0}
          >
            Print / Save PDF
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="stack">
      <header className="row row--between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Reports &amp; Analytics</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            System-wide trends and performance — KNUST Library
          </p>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Button variant="outline" onClick={handleExportCsv} disabled={activeRows.length === 0}>
            <Download size={18} />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPdf} disabled={activeRows.length === 0}>
            <Download size={18} />
            Export PDF
          </Button>
          <div className="row" style={{ gap: 8 }}>
            <Calendar size={18} style={{ color: "var(--muted)" }} aria-hidden />
            <Select
              aria-label="Report period"
              options={REPORT_PERIODS}
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              style={{ width: 150 }}
            />
          </div>
        </div>
      </header>

      <AlertBanner
        tone="info"
        message={`All reports reflect library data up to ${reportPeriod}. Live data will sync when the backend is connected.`}
      />

      <section className="grid-stats">
        {STATS.map((stat) => (
          <StatCard key={stat.eyebrow} {...stat} />
        ))}
      </section>

      <div
        className="row"
        style={{
          flexWrap: "wrap",
          gap: 24,
          padding: "12px 20px",
          borderTop: "1px solid var(--border-soft)",
          borderBottom: "1px solid var(--border-soft)",
          background: "var(--surface)",
        }}
      >
        {SECONDARY_STATS.map((item) => (
          <div key={item.label} className="row" style={{ gap: 8 }}>
            <span style={{ color: "var(--muted)" }}>{item.label}:</span>
            <span style={{ fontWeight: 600 }}>{item.value}</span>
          </div>
        ))}
      </div>

      <section className="stack">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "borrowing" && (
          <Card
            title="Monthly Borrowing Trends"
            action={exportMenu}
          >
            <DataTable
              columns={BORROWING_COLUMNS}
              rows={filteredTrends}
              rowKey="id"
              emptyMessage={`No borrowing data for ${reportPeriod}.`}
            />
            <p
              style={{
                margin: "14px 0 0",
                fontSize: 14,
                color: "var(--muted)",
                fontStyle: "italic",
              }}
            >
              {filteredTrends.length > 0
                ? `${reportPeriod}: ${filteredTrends[0].total} borrows, ${filteredTrends[0].returnRate}% return rate`
                : "Select a different period to view trends."}
            </p>
          </Card>
        )}

        {activeTab === "activity" && (
          <Card
            title="User Activity Breakdown"
            action={
              <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                <div style={{ position: "relative", width: 220 }}>
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
                    placeholder="Search user..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{ paddingLeft: 40 }}
                  />
                </div>
                {exportMenu}
              </div>
            }
          >
            <DataTable
              columns={USER_COLUMNS}
              rows={filteredUsers}
              rowKey="id"
              emptyMessage="No users match your search."
            />
          </Card>
        )}

        {activeTab === "popularity" && (
          <Card
            title="Most Borrowed Books"
            action={
              <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                {filterOpen && (
                  <Select
                    label="Category"
                    options={CATEGORY_OPTIONS}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{ width: 180 }}
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterOpen((open) => !open)}
                  aria-expanded={filterOpen}
                >
                  <Filter size={16} />
                  {filterOpen ? "Hide Filter" : "Filter"}
                </Button>
                {categoryFilter !== "All Categories" && (
                  <Button variant="ghost" size="sm" onClick={clearBookFilter}>
                    Clear
                  </Button>
                )}
                {exportMenu}
              </div>
            }
          >
            <DataTable
              columns={BOOK_COLUMNS}
              rows={filteredBooks}
              rowKey="id"
              emptyMessage="No books match the selected category."
            />
            <p
              style={{
                margin: "14px 0 0",
                paddingTop: 14,
                borderTop: "1px solid var(--border-soft)",
                fontSize: 14,
                color: "var(--muted)",
                fontStyle: "italic",
              }}
            >
              {filteredBooks.length > 0
                ? `Most popular category: ${topCategory} · ${outOfStockCount} book(s) currently out of stock`
                : "Try clearing the category filter to see all books."}
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
