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
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
PORT=5001          # 5000 is taken by macOS AirPlay Receiver
TERMII_API_KEY=          # optional, only for overdue SMS
```

> The **service role key is required in practice.** RLS is enabled on `users`,
> and under the anon key that table reads back empty with no error — every
> caller resolves as a "student" and the member list is blank. The server
> starts either way but warns at boot. Both keys are on the same dashboard
> page: Project Settings > API.
>
> It bypasses RLS, so it is server-side only. Never put it in a `VITE_*`
> variable — those are compiled into the frontend bundle.

**`frontend/.env`** — optional. Without it the UI runs on mock data and needs
no backend at all:

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:5001/api
```

> `VITE_USE_MOCK` must be the exact string `false` to hit the real backend.
> Any other value — including unset — keeps mock mode.

### 3. Apply migrations

See [`database/SCHEMA.md`](database/SCHEMA.md). All four migrations are applied
to the live project as of 2026-08-13 — `users.phone` and the `favorites` table
were both verified present, so profile editing, SMS reminders and favorites
have the schema they need. A fresh project still needs them run.

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

* **No automated tests.** Verification so far has been manual.
* **Reports aggregate in JS** and read at most Supabase's default 1000-row
  page. Correct at the scale in the SRS; needs Postgres RPCs beyond it.
* **`GET /api/books` returns the whole catalogue.** There is no `limit` or
  `offset`, and a `limit` in the query string is ignored rather than rejected.
  Same 1000-row ceiling as above.
* **`books.published_year` doesn't exist.** The column was never added, so a
  body naming it is dropped before it reaches the database. Nothing sends it any
  more; the note is here because two earlier task specs asked for the field.
* **Deactivating or demoting a member only writes `public.users`.** The role in
  the auth record's `user_metadata` is left alone, and `resolveIdentity` falls
  back to it whenever that table can't be read — so on a misconfigured deploy a
  demoted user keeps their old role. Closing this needs
  `auth.admin.updateUserById`.
* **`books.isbn` is `VARCHAR(13)`,** so it holds only the bare form. The API
  strips hyphens and spaces on the way in and on lookup; a row written directly
  through the Supabase dashboard in hyphenated form will not be findable at the
  circulation desk.
* **Borrowing races on the last copy** resolve at the database CHECK
  constraint, which the API reports as a 409. Correct, but the loser sees a
  retry prompt rather than the transaction being queued.
