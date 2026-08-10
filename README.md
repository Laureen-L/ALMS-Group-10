# ALMS — Automated Library Management System

KNUST Computer Science Department, Group 10.

A library system with three roles: **students** browse and borrow, **librarians**
run the circulation desk and the catalogue, **admins** manage members and read
reports.

---

## Running it

Requires Node 18+.

### 1. Install

```bash
npm install --prefix backend && npm install --prefix frontend
```

### 2. Configure

Copy [`.env.example`](.env.example) and fill it in.

**`backend/.env`** — the server won't start without the first two:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon key>
PORT=5001          # 5000 is taken by macOS AirPlay Receiver
TERMII_API_KEY=          # optional, only for overdue SMS
```

**`frontend/.env`** — optional. Without it the UI runs on mock data and needs
no backend at all:

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:5001/api
```

> `VITE_USE_MOCK` must be the exact string `false` to hit the real backend.
> Any other value — including unset — keeps mock mode.

### 3. Apply migrations

See [`database/SCHEMA.md`](database/SCHEMA.md). Two migrations are **not yet
applied** to the live project and features will fail without them:

* `20260808120000_user_phone` — profile editing, SMS reminders
* `20260808130000_favorites` — the favorites feature

The trigger migration (`20260623024516_triggers`) is raw SQL that Prisma does
not run for you, and `trg_update_availability` is what keeps book availability
correct. Verify it is deployed.

### 4. Run

```bash
npm run dev --prefix backend
```

```bash
npm run dev --prefix frontend
```

Frontend on `http://localhost:5173`, backend on `http://localhost:5001`.

### Mock logins

In mock mode any password works with:

| Email | Role |
| :--- | :--- |
| `student@knust.edu.gh` | student |
| `librarian@knust.edu.gh` | librarian |
| `admin@knust.edu.gh` | admin |

---

## Layout

```
backend/          Express API — routes/ controllers/ middleware/
  API_CONTRACT.md every endpoint, with request/response shapes
frontend/         Vite + React 18
  src/services/   all API calls live here — pages never fetch directly
  src/pages/      one folder per role, plus shared/
  src/routes/     the route tree
database/
  SCHEMA.md       schema notes, triggers, RLS status
prisma/           schema + migrations
```

Two conventions worth knowing before adding code:

**Pages don't call `fetch`.** They import from `src/services/`, which handles
the base URL, the auth token, and the mock/real switch. Adding a `fetch` in a
page bypasses all three.

**Members are `users`, not `profiles`.** Some task specs say otherwise. See
[`database/SCHEMA.md`](database/SCHEMA.md).

---

## Known gaps

* **The backend needs the Supabase _service role_ key, not the anon key.**
  RLS is enabled on `users`, and under the anon key that table reads back empty
  with no error — so every user silently becomes a "student" and the member
  list comes back blank. See `database/SCHEMA.md`.
* **No automated tests.** Verification so far has been manual.
* **Reports aggregate in JS** and read at most Supabase's default 1000-row
  page. Correct at the scale in the SRS; needs Postgres RPCs beyond it.
* **`books.published_year` doesn't exist** but some frontend code still sends
  it — Add Book will reject it.
* **Password changes** are not implemented; the button is disabled.
