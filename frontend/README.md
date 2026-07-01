# KNUST Library ALMS — Frontend

React (Vite) frontend for the library system. The **foundation layer is built**
(Person 1's job): design tokens, layouts, routing, auth, and the shared component
library. Persons 2–5 fill in their screen files under `src/pages/`.

## Run it
```bash
npm install
npm run dev
```

### Dev logins (mock auth — no backend needed yet)
Any password works. Pick the role you want to test:
- `student@knust.edu.gh`
- `librarian@knust.edu.gh`
- `admin@knust.edu.gh`

Mock auth lives in `src/context/AuthContext.jsx`. When the backend is ready,
swap the body of `login()` for a real call — nothing else changes.

## What's already built (foundation)
- `src/styles/` — tokens (colors/fonts) + shared component CSS
- `src/layouts/` — AuthLayout, StudentLayout, AdminLayout (sidebar + topbar)
- `src/routes/` — route tree, ProtectedRoute, RoleRoute, home redirect
- `src/context/AuthContext.jsx` — login/logout/role
- `src/services/apiClient.js` — fetch wrapper (reads VITE_API_BASE_URL, attaches JWT)
- `src/components/ui/` — Button, Input, Select, Toggle, Badge, Avatar, Card, Modal, Tabs, Breadcrumb, RatingStars, AlertBanner
- `src/components/tables/` — DataTable, StatusBadge, Pagination
- `src/components/stats/StatCard.jsx`
- `src/components/navigation/` — Sidebar, TopBar, navConfig
- `src/pages/shared/` — NotFoundPage (Screen 7), SettingsPage
- `src/pages/auth/LoginPage.jsx` — minimal working login (Person 3 restyles)

## Screen → file map (still to build)
| Screen | File | Owner |
|--------|------|-------|
| 1 — Student Dashboard      | src/pages/student/DashboardPage.jsx      | P2 |
| 2 — Book Detail / Catalog  | src/pages/student/BookDetailPage.jsx     | P2 |
| 3 — Forgot Password        | src/pages/auth/ForgotPasswordPage.jsx    | P3 |
| 4 — Admin Dashboard        | src/pages/admin/DashboardPage.jsx        | P5 |
| 5 — Librarian Dashboard    | src/pages/librarian/DashboardPage.jsx    | P4 |
| 6 — Student Profile        | src/pages/student/ProfilePage.jsx        | P3 |
| 7 — 404 Not Found          | src/pages/shared/NotFoundPage.jsx        | ✅ done |
| 8 — Reports & Analytics    | src/pages/admin/ReportsPage.jsx          | P5 |

## How to build a screen (the pattern)
1. Import the layout pieces you need from `src/components/...`
2. Get data from a `src/services/...` function (return mock JSON for now)
3. Compose: `StatCard`s, a `DataTable`, `BookCard`s, etc.
4. Handle loading / empty / error (DataTable already does this for tables)

Example — a dashboard table:
```jsx
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";

<DataTable
  columns={[
    { key: "title", header: "Book Title" },
    { key: "author", header: "Author" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ]}
  rows={borrowings}
  loading={loading}
  emptyMessage="No borrowings yet."
/>
```
