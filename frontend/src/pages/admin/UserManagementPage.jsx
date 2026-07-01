// Admin — User Management (roles, suspend/activate).

import { useCallback, useEffect, useMemo, useState } from "react";

import { Ban, ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";

import AlertBanner from "../../components/ui/AlertBanner.jsx";

import Avatar from "../../components/ui/Avatar.jsx";

import Badge from "../../components/ui/Badge.jsx";

import Button from "../../components/ui/Button.jsx";

import Card from "../../components/ui/Card.jsx";

import Input from "../../components/ui/Input.jsx";

import Modal from "../../components/ui/Modal.jsx";

import Select from "../../components/ui/Select.jsx";

import DataTable from "../../components/tables/DataTable.jsx";



const PAGE_SIZE = 5;



const ROLE_OPTIONS = ["All", "Student", "Librarian", "Admin"];

const STATUS_OPTIONS = ["All", "Active", "Suspended", "Pending"];

const ROLE_FORM_OPTIONS = ["Student", "Librarian", "Admin"];

const STATUS_FORM_OPTIONS = ["Active", "Pending", "Suspended"];



const ROLE_TONE = {

  Student: "neutral",

  Librarian: "green",

  Admin: "gold",

};



const STATUS_TONE = {

  Active: "green",

  Pending: "amber",

  Suspended: "red",

};



const INITIAL_USERS = [

  {

    id: 1,

    name: "Kwame Asante",

    email: "k.asante@st.knust.edu.gh",

    avatar:

      "https://lh3.googleusercontent.com/aida-public/AB6AXuC7nw_Hgbgokur4qQD7reAJeyFeJn8WGvGQGn90brGGHjkWqICxkXxlft2KmgFJtfKSTa_MIeHJ7zhkT3k4eegk-FF2BoGisvCP04SI4WGKIqwxKeFf83PL1vN8ZbyRgSN_A54wjtRqdD0Ap7DxCISwtdQa5vqaRbjW50fPXJDdTjRM5acjvnhgl_Mrud0IjMtwq94IoAkT_GTxz2EJ5jqm7LTFmZ6aRZZIo8zPL65F4gYgLZSDLWjxTImnzgv0ECFSxiPpH7JU4Ac",

    role: "Student",

    joined: "2023-09-01",

    status: "Active",

  },

  {

    id: 2,

    name: "Ama Owusu",

    email: "a.owusu@knust.edu.gh",

    role: "Librarian",

    joined: "2021-01-15",

    status: "Active",

  },

  {

    id: 3,

    name: "Admin User",

    email: "admin@knust.edu.gh",

    avatar:

      "https://lh3.googleusercontent.com/aida-public/AB6AXuBEWaFTJjZxuDcdjkDoVnvnFulppwau5lMhWJoh42PjaKayLHNQeTApswodOYrw_PIRur0tzivJZpdTle-7JV6gsnw2vbl8dERDGZlIjIga-15Btb5EPh7zI15f4P_8tIimpdq9AROZl8DY8P0nb3C12TZyY3TNQfyEHPGhG5cBGSJce24rWDh_0wj4FKPgsC9PrPe9ur7nOks3NMnKC_gEHDk3kuEOkPiZsvgOhYNzavv94Ilf5izCafgtTErJ6YSNBJ_YuppFDlRne4",

    role: "Admin",

    joined: "2020-05-10",

    status: "Active",

  },

  {

    id: 4,

    name: "Kofi Mensah",

    email: "k.mensah@st.knust.edu.gh",

    role: "Student",

    joined: "2024-01-20",

    status: "Pending",

  },

  {

    id: 5,

    name: "Abena Frimpong",

    email: "a.frimpong@st.knust.edu.gh",

    role: "Student",

    joined: "2022-08-12",

    status: "Suspended",

  },

];



const EMPTY_FORM = {

  name: "",

  email: "",

  role: "Student",

  status: "Active",

};



function buildSummary(users) {

  const active = users.filter((user) => user.status === "Active").length;

  const pending = users.filter((user) => user.status === "Pending").length;

  const suspended = users.filter((user) => user.status === "Suspended").length;

  return [

    { label: `${active} Active`, tone: "green" },

    { label: `${pending} Pending`, tone: "gold" },

    { label: `${suspended} Suspended`, tone: "red" },

  ];

}



export default function UserManagementPage() {

  const [users, setUsers] = useState(INITIAL_USERS);

  const [showAddModal, setShowAddModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [formErrors, setFormErrors] = useState({});

  const [search, setSearch] = useState("");

  const [roleFilter, setRoleFilter] = useState("All");

  const [statusFilter, setStatusFilter] = useState("All");

  const [page, setPage] = useState(1);

  const [notice, setNotice] = useState(null);



  useEffect(() => {

    if (!notice) return undefined;

    const timer = window.setTimeout(() => setNotice(null), 3500);

    return () => window.clearTimeout(timer);

  }, [notice]);



  useEffect(() => {

    setPage(1);

  }, [search, roleFilter, statusFilter]);



  const filteredUsers = useMemo(() => {

    const query = search.trim().toLowerCase();

    return users.filter((user) => {

      const matchesSearch =

        !query ||

        user.name.toLowerCase().includes(query) ||

        user.email.toLowerCase().includes(query);

      const matchesRole = roleFilter === "All" || user.role === roleFilter;

      const matchesStatus = statusFilter === "All" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;

    });

  }, [users, search, roleFilter, statusFilter]);



  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  const safePage = Math.min(page, totalPages);



  useEffect(() => {

    if (page > totalPages) setPage(totalPages);

  }, [page, totalPages]);



  const paginatedUsers = useMemo(() => {

    const start = (safePage - 1) * PAGE_SIZE;

    return filteredUsers.slice(start, start + PAGE_SIZE);

  }, [filteredUsers, safePage]);



  const summary = useMemo(() => buildSummary(users), [users]);



  const updateForm = (field, value) => {

    setForm((prev) => ({ ...prev, [field]: value }));

    if (formErrors[field]) {

      setFormErrors((prev) => ({ ...prev, [field]: undefined }));

    }

  };



  const validateForm = () => {

    const errors = {};

    if (!form.name.trim()) errors.name = "Full name is required.";

    if (!form.email.trim()) errors.email = "Email is required.";

    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {

      errors.email = "Enter a valid email address.";

    } else if (

      users.some(

        (user) =>

          user.email.toLowerCase() === form.email.trim().toLowerCase() &&

          user.id !== editingUser?.id,

      )

    ) {

      errors.email = "This email is already registered.";

    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;

  };



  const resetForm = () => {

    setForm(EMPTY_FORM);

    setFormErrors({});

  };



  const openAddModal = useCallback(() => {

    resetForm();

    setEditingUser(null);

    setShowAddModal(true);

  }, []);



  const openEditModal = useCallback((user) => {

    setEditingUser(user);

    setForm({

      name: user.name,

      email: user.email,

      role: user.role,

      status: user.status,

    });

    setFormErrors({});

    setShowEditModal(true);

  }, []);



  const closeAddModal = () => {

    setShowAddModal(false);

    resetForm();

  };



  const closeEditModal = () => {

    setShowEditModal(false);

    setEditingUser(null);

    resetForm();

  };



  const handleCreateUser = () => {

    if (!validateForm()) return;



    const nextId = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;

    const newUser = {

      id: nextId,

      name: form.name.trim(),

      email: form.email.trim(),

      role: form.role,

      status: form.status,

      joined: new Date().toISOString().slice(0, 10),

    };



    setUsers((prev) => [...prev, newUser]);

    setNotice(`${newUser.name} was added successfully.`);

    closeAddModal();

  };



  const handleSaveUser = () => {

    if (!validateForm() || !editingUser) return;



    setUsers((prev) =>

      prev.map((user) =>

        user.id === editingUser.id

          ? {

              ...user,

              name: form.name.trim(),

              email: form.email.trim(),

              role: form.role,

              status: form.status,

            }

          : user,

      ),

    );

    setNotice(`${form.name.trim()} was updated successfully.`);

    closeEditModal();

  };



  const toggleSuspend = useCallback((user) => {

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



  const userColumns = useMemo(

    () => [

      {

        key: "user",

        header: "User",

        render: (row) => (

          <div className="row">

            <Avatar src={row.avatar} name={row.name} size={32} />

            <div>

              <p style={{ margin: 0, fontWeight: 600 }}>{row.name}</p>

              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{row.email}</p>

            </div>

          </div>

        ),

      },

      {

        key: "role",

        header: "Role",

        render: (row) => <Badge tone={ROLE_TONE[row.role]}>{row.role}</Badge>,

      },

      {

        key: "joined",

        header: "Joined Date",

        render: (row) => (

          <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--muted)" }}>

            {row.joined}

          </span>

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

            <Button variant="outline" size="sm" onClick={() => openEditModal(row)}>

              Edit

            </Button>

            <Button

              variant={row.status === "Suspended" ? "green" : "danger"}

              size="sm"

              aria-label={row.status === "Suspended" ? "Reactivate user" : "Suspend user"}

              onClick={() => toggleSuspend(row)}

            >

              <Ban size={14} />

            </Button>

          </div>

        ),

      },

    ],

    [openEditModal, toggleSuspend],

  );



  const userFormFields = (

    <div className="stack" style={{ gap: 16 }}>

      <Input

        label="Full Name"

        id="user-name"

        value={form.name}

        onChange={(e) => updateForm("name", e.target.value)}

        error={formErrors.name}

      />

      <Input

        label="Email Address"

        id="user-email"

        type="email"

        value={form.email}

        onChange={(e) => updateForm("email", e.target.value)}

        error={formErrors.email}

      />

      <div className="row" style={{ alignItems: "flex-start" }}>

        <Select

          label="Role"

          id="user-role"

          options={ROLE_FORM_OPTIONS}

          value={form.role}

          onChange={(e) => updateForm("role", e.target.value)}

          style={{ flex: 1 }}

        />

        <Select

          label="Status"

          id="user-status"

          options={STATUS_FORM_OPTIONS}

          value={form.status}

          onChange={(e) => updateForm("status", e.target.value)}

          style={{ flex: 1 }}

        />

      </div>

    </div>

  );



  return (

    <div className="stack">

      <header className="row row--between" style={{ flexWrap: "wrap", gap: 16 }}>

        <div>

          <h1 className="page-title">User Management</h1>

          <p className="page-sub" style={{ marginBottom: 0 }}>

            Manage all students, librarians, and admins

          </p>

        </div>

        <Button variant="gold" onClick={openAddModal}>

          <UserPlus size={18} />

          Add User

        </Button>

      </header>



      {notice && (

        <AlertBanner tone="info" message={notice} />

      )}



      <div className="row" style={{ flexWrap: "wrap", gap: 16 }}>

        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 420 }}>

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

            placeholder="Search name or email..."

            value={search}

            onChange={(e) => setSearch(e.target.value)}

            style={{ paddingLeft: 40 }}

          />

        </div>

        <Select

          label="Role"

          options={ROLE_OPTIONS}

          value={roleFilter}

          onChange={(e) => setRoleFilter(e.target.value)}

          style={{ width: 140 }}

        />

        <Select

          label="Status"

          options={STATUS_OPTIONS}

          value={statusFilter}

          onChange={(e) => setStatusFilter(e.target.value)}

          style={{ width: 140 }}

        />

      </div>



      <div

        className="row row--between"

        style={{

          flexWrap: "wrap",

          gap: 12,

          paddingBottom: 16,

          borderBottom: "1px solid var(--border-soft)",

        }}

      >

        <span style={{ color: "var(--muted)", fontSize: 14 }}>

          Showing {filteredUsers.length} of {users.length} users

        </span>

        <div className="row" style={{ flexWrap: "wrap" }}>

          {summary.map((item) => (

            <Badge key={item.label} tone={item.tone}>

              {item.label}

            </Badge>

          ))}

        </div>

      </div>



      <Card>

        <DataTable

          columns={userColumns}

          rows={paginatedUsers}

          rowKey="id"

          emptyMessage="No users match your filters."

        />

        <div className="row row--between" style={{ paddingTop: 14 }}>

          <span style={{ fontSize: 13, color: "var(--muted)" }}>

            Page {safePage} of {totalPages}

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

          title="Add New User"

          onClose={closeAddModal}

          footer={

            <>

              <Button variant="outline" onClick={closeAddModal}>

                Cancel

              </Button>

              <Button variant="gold" onClick={handleCreateUser}>

                Create User

              </Button>

            </>

          }

        >

          {userFormFields}

        </Modal>

      )}



      {showEditModal && editingUser && (

        <Modal

          title="Edit User"

          onClose={closeEditModal}

          footer={

            <>

              <Button variant="outline" onClick={closeEditModal}>

                Cancel

              </Button>

              <Button variant="gold" onClick={handleSaveUser}>

                Save Changes

              </Button>

            </>

          }

        >

          {userFormFields}

        </Modal>

      )}

    </div>

  );

}

