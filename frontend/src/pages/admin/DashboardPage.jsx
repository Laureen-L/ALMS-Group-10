// SCREEN 4 — Admin Dashboard: overview stats, lending charts, user mgmt + borrow records tables.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Search,
  Calendar,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";
import { BORROW_STATUS } from "../../constants/borrowStatus.js";

const MONO = { fontFamily: "monospace", fontSize: 13 };

const ROLE_TONE = {
  Student: "neutral",
  Librarian: "green",
  Admin: "gold",
};

const STATUS_TONE = {
  Active: "green",
  Suspended: "red",
};

const MONTHLY_LENDING = [
  { month: "Jan", loans: 120, height: "30%" },
  { month: "Feb", loans: 180, height: "45%" },
  { month: "Mar", loans: 260, height: "65%" },
  { month: "Apr", loans: 220, height: "55%" },
  { month: "May", loans: 300, height: "75%" },
  { month: "Jun", loans: 240, height: "60%" },
  { month: "Jul", loans: 350, height: "90%", highlight: true },
];

const INITIAL_USERS = [
  {
    id: "29401",
    name: "Ama Serwaa",
    email: "serwaa.a@knust.edu.gh",
    role: "Student",
    joined: "12 Oct 2023",
    status: "Active",
  },
  {
    id: "28312",
    name: "Kofi Owusu",
    email: "owusu.k@knust.edu.gh",
    role: "Librarian",
    joined: "05 Sep 2023",
    status: "Active",
  },
  {
    id: "27551",
    name: "Dr. Isaac Manu",
    email: "manu.i@knust.edu.gh",
    role: "Admin",
    joined: "15 Aug 2023",
    status: "Suspended",
  },
];

const INITIAL_BORROWS = [
  {
    id: "BR-1029",
    member: "Ama Serwaa",
    book: "Modern Algorithms in Java",
    borrowedOn: "Oct 12, 2023",
    dueDate: "Nov 02, 2023",
    returnedOn: null,
    status: BORROW_STATUS.ACTIVE,
  },
  {
    id: "BR-1024",
    member: "Kwame Mensah",
    book: "Intro to Quantum Computing",
    borrowedOn: "Sep 20, 2023",
    dueDate: "Oct 20, 2023",
    returnedOn: null,
    status: BORROW_STATUS.OVERDUE,
  },
  {
    id: "BR-1012",
    member: "Abena Fosua",
    book: "Data Structures 101",
    borrowedOn: "Sep 01, 2023",
    dueDate: "Sep 15, 2023",
    returnedOn: "Sep 14, 2023",
    status: BORROW_STATUS.RETURNED,
  },
];

const BORROW_STATUS_FILTER = {
  "All Status": null,
  Active: BORROW_STATUS.ACTIVE,
  Overdue: BORROW_STATUS.OVERDUE,
  Returned: BORROW_STATUS.RETURNED,
};

const ROLE_FILTERS = ["All", "Student", "Staff"];

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isStaffRole(role) {
  return role === "Librarian" || role === "Admin";
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState(INITIAL_USERS);
  const [borrows] = useState(INITIAL_BORROWS);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [borrowStatusFilter, setBorrowStatusFilter] = useState("All Status");
  const [notice, setNotice] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.id.includes(query);
      const matchesRole =
        roleFilter === "All" ||
        (roleFilter === "Student" && user.role === "Student") ||
        (roleFilter === "Staff" && isStaffRole(user.role));
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  const filteredBorrows = useMemo(() => {
    const statusKey = BORROW_STATUS_FILTER[borrowStatusFilter];
    if (!statusKey) return borrows;
    return borrows.filter((record) => record.status === statusKey);
  }, [borrows, borrowStatusFilter]);

  const toggleUserStatus = useCallback((user) => {
    const nextStatus = user.status === "Suspended" ? "Active" : "Suspended";
    setUsers((prev) =>
      prev.map((entry) =>
        entry.id === user.id ? { ...entry, status: nextStatus } : entry,
      ),
    );
    setNotice(
      nextStatus === "Suspended"
        ? `${user.name} has been suspended.`
        : `${user.name} has been reactivated.`,
    );
  }, []);

  const handleEditUser = useCallback(
    (user) => {
      navigate("/admin/users", { state: { editUserId: user.id } });
    },
    [navigate],
  );

  const userColumns = useMemo(
    () => [
      {
        key: "id",
        header: "User ID",
        render: (row) => (
          <span style={{ ...MONO, color: "var(--muted)" }}>#{row.id}</span>
        ),
      },
      { key: "name", header: "Name", render: (row) => <strong>{row.name}</strong> },
      {
        key: "email",
        header: "Email",
        render: (row) => (
          <span style={{ color: "var(--muted)" }}>{row.email}</span>
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (row) => <Badge tone={ROLE_TONE[row.role]}>{row.role}</Badge>,
      },
      {
        key: "joined",
        header: "Join Date",
        render: (row) => (
          <span style={{ color: "var(--muted)" }}>{row.joined}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="outline" size="sm" onClick={() => handleEditUser(row)}>
              Edit
            </Button>
            <Button
              variant={row.status === "Suspended" ? "green" : "danger"}
              size="sm"
              onClick={() => toggleUserStatus(row)}
            >
              {row.status === "Suspended" ? "Activate" : "Suspend"}
            </Button>
          </div>
        ),
      },
    ],
    [handleEditUser, toggleUserStatus],
  );

  const borrowColumns = useMemo(
    () => [
      {
        key: "id",
        header: "Record ID",
        render: (row) => (
          <span style={{ ...MONO, color: "var(--muted)" }}>#{row.id}</span>
        ),
      },
      { key: "member", header: "Member Name", render: (row) => <strong>{row.member}</strong> },
      {
        key: "book",
        header: "Book Title",
        render: (row) => (
          <span style={{ color: "var(--muted)" }} title={row.book}>
            {row.book}
          </span>
        ),
      },
      {
        key: "borrowedOn",
        header: "Borrow Date",
        render: (row) => (
          <span style={{ color: "var(--muted)" }}>{row.borrowedOn}</span>
        ),
      },
      {
        key: "dueDate",
        header: "Due Date",
        render: (row) => (
          <span
            style={{
              color: row.status === BORROW_STATUS.OVERDUE ? "var(--red-600)" : "var(--muted)",
              fontWeight: row.status === BORROW_STATUS.OVERDUE ? 600 : 400,
            }}
          >
            {row.dueDate}
          </span>
        ),
      },
      {
        key: "returnedOn",
        header: "Return Date",
        render: (row) => (
          <span style={{ color: "var(--muted)" }}>{row.returnedOn ?? "—"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <div style={{ textAlign: "right" }}>
            <StatusBadge status={row.status} />
          </div>
        ),
      },
    ],
    [],
  );

  const statLinkStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    fontSize: 14,
    fontWeight: 600,
    color: "var(--green-600)",
  };

  return (
    <div className="stack">
      <header className="row row--between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">System Overview</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Real-time statistics for the Kwame Nkrumah University of Science and Technology library.
          </p>
        </div>
        <div
          className="row"
          style={{
            padding: "8px 16px",
            background: "var(--surface)",
            border: "1px solid var(--border-soft)",
            borderRadius: "var(--radius-sm)",
            color: "var(--muted)",
            fontSize: 14,
          }}
        >
          <Calendar size={18} />
          <span>{formatToday()}</span>
        </div>
      </header>

      {notice && <AlertBanner tone="info" message={notice} />}

      <div className="grid-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div>
          <StatCard tone="neutral" eyebrow="Total Books" value="1,247" label="+12% this month" icon={BookOpen} />
          <Link to="/admin/catalog" style={statLinkStyle}>
            View All Books <ArrowRight size={16} />
          </Link>
        </div>
        <div>
          <StatCard tone="neutral" eyebrow="Total Members" value="856" label="Registered users" icon={Users} />
          <Link to="/admin/users" style={statLinkStyle}>
            View All Members <ArrowRight size={16} />
          </Link>
        </div>
        <div>
          <StatCard tone="active" eyebrow="Active Loans" value="142" label="Currently borrowed" icon={RefreshCw} />
          <Link to="/admin/borrow-records" state={{ statusFilter: "Active" }} style={statLinkStyle}>
            View Active Loans <ArrowRight size={16} />
          </Link>
        </div>
        <div>
          <StatCard tone="critical" eyebrow="Overdue Loans" value="23" label="Requires attention" icon={AlertTriangle} />
          <Link
            to="/admin/borrow-records"
            state={{ statusFilter: "Overdue" }}
            style={{ ...statLinkStyle, color: "var(--red-600)" }}
          >
            View Overdue <ArrowRight size={16} />
          </Link>
        </div>
        <StatCard tone="neutral" eyebrow="Total Returns" value="3,891" label="All time" icon={ClipboardList} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Card title="Monthly Lending Trends">
          <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: 14 }}>
            Books issued per month
          </p>
          <div
            className="dashboard-chart-bars"
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              minHeight: 220,
              padding: "32px 8px 8px",
              borderBottom: "1px solid var(--border-soft)",
              position: "relative",
            }}
          >
            {MONTHLY_LENDING.map((bar) => (
              <div
                key={bar.month}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                onMouseEnter={() => setHoveredBar(bar.month)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {hoveredBar === bar.month && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: "var(--green-900)",
                      color: "#fff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {bar.loans} Loans
                  </span>
                )}
                <div
                  style={{
                    width: "100%",
                    height: bar.height,
                    minHeight: 24,
                    borderRadius: "4px 4px 0 0",
                    background: bar.highlight ? "var(--green-600)" : "var(--cream-dark)",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  title={`${bar.loans} loans`}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: bar.highlight ? 700 : 500,
                    textTransform: "uppercase",
                    color: bar.highlight ? "var(--green-600)" : "var(--muted)",
                  }}
                >
                  {bar.month}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Loans vs Returns">
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>
            Current Academic Year
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", width: 192, height: 192 }}>
              <svg
                viewBox="0 0 100 100"
                style={{
                  width: "100%",
                  height: "100%",
                  transform: "rotate(-90deg)",
                }}
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="var(--cream-dark)"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="var(--green-600)"
                  strokeWidth="12"
                  strokeDasharray="238.76"
                  strokeDashoffset="35.81"
                  strokeLinecap="round"
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>
                  85%
                </span>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  Return Rate
                </span>
              </div>
            </div>
            <div
              className="row"
              style={{
                justifyContent: "center",
                gap: 24,
                paddingTop: 16,
                borderTop: "1px solid var(--border-soft)",
                width: "100%",
              }}
            >
              <div className="row" style={{ gap: 8 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "var(--green-600)",
                  }}
                />
                <span style={{ fontSize: 14, color: "var(--muted)" }}>
                  <strong style={{ color: "var(--ink)" }}>85%</strong> Rate
                </span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "var(--cream-dark)",
                  }}
                />
                <span style={{ fontSize: 14, color: "var(--muted)" }}>
                  <strong style={{ color: "var(--ink)" }}>15%</strong> Pending
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="User Management"
        action={
          <Link to="/admin/users" className="btn btn--outline btn--sm">
            Manage All Users
          </Link>
        }
      >
        <div className="row" style={{ flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 320 }}>
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
              placeholder="Search members..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
          <div className="tabs" style={{ borderBottom: "none", gap: 4 }}>
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`tabs__tab${roleFilter === filter ? " tabs__tab--active" : ""}`}
                style={{ borderBottom: roleFilter === filter ? undefined : "2px solid transparent" }}
                onClick={() => setRoleFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <DataTable
          columns={userColumns}
          rows={filteredUsers}
          rowKey="id"
          emptyMessage="No members match your search."
        />
      </Card>

      <Card title="Borrow Records">
        <div className="row row--between" style={{ flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
            <select
              className="select"
              value={borrowStatusFilter}
              onChange={(e) => setBorrowStatusFilter(e.target.value)}
              style={{ width: 160 }}
              aria-label="Filter by status"
            >
              {Object.keys(BORROW_STATUS_FILTER).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button
              variant="green"
              size="sm"
              onClick={() =>
                setNotice(`Showing ${filteredBorrows.length} borrow record(s) for "${borrowStatusFilter}".`)
              }
            >
              Filter
            </Button>
          </div>
        </div>
        <DataTable
          columns={borrowColumns}
          rows={filteredBorrows}
          rowKey="id"
          emptyMessage="No borrow records match this filter."
        />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 16 }}>
          <Link
            to="/admin/borrow-records"
            className="btn btn--ghost"
            style={{ color: "var(--gold-600)", fontWeight: 600 }}
          >
            View All 1,200+ Records
            <ChevronRight size={18} />
          </Link>
        </div>
      </Card>
    </div>
  );
}
