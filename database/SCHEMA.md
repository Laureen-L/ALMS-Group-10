# ALMS — Database Schema

Supabase PostgreSQL. The authoritative definition is
[`prisma/schema.prisma`](../prisma/schema.prisma); this document explains the
parts that aren't obvious from reading it.

---

## ⚠️ There is no `profiles` table

Members live in **`public.users`**. Several task specs circulating in the team
refer to a `profiles` table with a `name` column — that table has never
existed. When translating those specs:

| Spec says | Actually |
| :--- | :--- |
| `profiles` | `users` |
| `name` | `full_name` |

---

## Tables

| Table | Purpose |
| :--- | :--- |
| `users` | Every actor: student, librarian, admin. Auth is delegated to Supabase Auth. |
| `books` | The catalogue. `available_quantity` is maintained by trigger. |
| `borrow_records` | Loans. One row per borrow, updated in place on return. |
| `fines` | Auto-created when a loan turns overdue. Billing is out of scope for v1.0. |
| `favorites` | Books a member saved for later. |

### `users`

`id` matches the Supabase Auth user id — everything joins on it. Registration
writes both: `supabase.auth.signUp()` creates the auth user, then the API
mirrors it into `users` with the same id.

`password_hash` is **NOT NULL but unused**. Credentials live in Supabase Auth;
registration writes the sentinel `'managed_by_supabase_auth'` to satisfy the
constraint. Making the column nullable would be cleaner and is safe to do.

`is_active = false` is a soft delete. It has teeth because `requireAuth`
rejects every request from an inactive account.

`phone` is nullable and only used by the overdue SMS job. A member without one
still gets the overdue notice — it just arrives in-app only. See `notifications`.

### `books`

`available_quantity` is **never written by application code**. See Triggers.

`isbn` is unique but nullable — items without an ISBN are allowed. The
circulation desk looks books up by it, so it must be populated for a title to
be scannable.

`isbn` is `VARCHAR(13)`, which holds an ISBN-13 only in its **bare** form — the
printed, hyphenated form ("978-0-13-235088-4") is too long to store. The API
therefore strips hyphens and spaces on every write and on every lookup
(`backend/src/utils/isbn.js`), so the two formats are interchangeable at the
edge. A row inserted by hand through the Supabase dashboard bypasses that and
will not be findable by scan.

There is **no `published_year` column**. Nothing sends one any more, but the
column is absent, so a request that names it is rejected outright.

### `borrow_records`

`borrow_date`, `due_date` and `return_date` are `DATE`, not timestamps — send
`YYYY-MM-DD`, not an ISO timestamp.

Two foreign keys point at `users`: `user_id` (the borrower) and `processed_by`
(the staff member who ran the transaction, null for self-service). PostgREST
therefore can't infer which to embed — queries must name the constraint:

```js
.select('*, users!borrow_records_user_id_fkey(full_name, email)')
```

`status` is `active` / `returned` / `overdue`. **`overdue` is stamped only by
the nightly pg_cron job**, so between runs a loan can be past its due date
while still marked `active`. Anything measuring overdue-ness must check the
date as well as the status.

### `favorites`

Both foreign keys `CASCADE` on delete — a favorite is a pointer, not a record
worth preserving. This differs deliberately from `borrow_records`, which uses
`RESTRICT` to protect loan history.

`UNIQUE (user_id, book_id)` is relied on by the API: adding the same favorite
twice is an upsert, not an error.

### `notifications`

In-app notices — the delivery channel with no external dependency. Overdue
reminders were SMS-only, which put the whole feature behind a Termii API key
and a sender ID awaiting approval; a row here always reaches the member.

`read_at` **is** the unread flag. NULL means unread, so there is no separate
boolean that could drift out of step with the timestamp.

`notifications_unread_per_loan_key` is a **partial unique index** on
`(borrow_id, type) WHERE read_at IS NULL AND borrow_id IS NOT NULL`. It stops a
librarian who clicks "Send reminders" twice from giving every member two
identical notices. The API relies on it: the duplicate insert is caught as
Postgres `23505` and reported as `alreadyNotified` rather than an error.
Scoped to unread rows on purpose — once the member has read the notice, a book
still overdue next week warrants telling them again.

Prisma cannot express a partial index, so it lives only in the migration SQL.
Regenerating the schema from the database will not reproduce it.

`user_id` CASCADEs like `favorites`. `borrow_id` is `SET NULL`: a notice the
member already received still happened, even if the loan record goes.

---

## Triggers

Defined in [`prisma/migrations/20260623024516_triggers/migration.sql`](../prisma/migrations/20260623024516_triggers/migration.sql).
Prisma does not generate these — the file must be run separately.

| Trigger | Does |
| :--- | :--- |
| `trg_set_due_date` | Defaults `due_date` to `borrow_date + 14 days` |
| `trg_update_availability` | **Owns `books.available_quantity`** — decrements on borrow, increments on return |
| `trg_auto_overdue_fine` | Creates a `fines` row when a loan turns overdue (days × 0.50 GHS) |
| `trg_*_updated_at` | Maintains `updated_at` on `users`, `books`, `borrow_records` |

### `trg_update_availability` is load-bearing

`borrowController` used to *also* adjust `available_quantity` by hand, so stock
moved by 2 per transaction. That manual update has been removed. Verify the
trigger exists before trusting availability:

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM   information_schema.triggers
WHERE  trigger_schema = 'public'
ORDER  BY event_object_table, trigger_name;
```

If `trg_update_availability` is missing, availability will never change.

---

## The nightly overdue job

Not a trigger. Marks loans overdue once a day, which in turn fires
`trg_auto_overdue_fine`. Enable `pg_cron` in the Supabase dashboard, then:

```sql
SELECT cron.schedule(
  'mark-overdue-loans',
  '5 0 * * *',
  $$ UPDATE borrow_records
     SET    status = 'overdue', updated_at = now()
     WHERE  status = 'active' AND due_date < CURRENT_DATE; $$
);
```

Until this is scheduled, no loan is ever marked overdue and no fine is created.

---

## Migrations

Run in order. The first four are applied to the live project as of 2026-08-13
(`users.phone` and `favorites` were both verified present). A fresh project
still needs them run.

| Migration | Adds |
| :--- | :--- |
| `20260623023130_init` | Tables, enums, indexes, foreign keys |
| `20260623024516_triggers` | Triggers + CHECK constraints (raw SQL, run manually) |
| `20260808120000_user_phone` | `users.phone` — **needed for profile editing and SMS** |
| `20260808130000_favorites` | `favorites` table — **needed for the favorites feature** |
| `20260813120000_notifications` | `notifications` table — **needed for in-app overdue notices** (not yet applied) |

Apply with `npx prisma migrate deploy`, or paste the SQL into the Supabase SQL
Editor.

---

## Row Level Security

**RLS is enabled on `users`, and it silently breaks the backend when the API
runs on the anon key.**

Observed against the live project on 2026-08-08:

| Table | Anon key can read? |
| :--- | :--- |
| `books` | yes (23 rows) |
| `borrow_records` | yes (19 rows) |
| `users` | **no — returns 0 rows, no error** |

`users` is not empty: `borrow_records` holds a `RESTRICT` foreign key to it and
references real ids, so those rows must exist. RLS is filtering them out.

The failure mode is nasty because **PostgREST returns an empty result, not an
error**. Every role lookup therefore succeeds-but-empty, and the code falls
through to its default:

* `login` finds no profile → returns `role: "student"` for everyone
* `requireAuth` finds no profile → treats every caller as a student
* `getMembers` returns `[]`
* `register`'s insert into `users` is rejected

### The fix — applied 2026-08-13

The backend's shared database client runs on the **service role** key. Service
role bypasses RLS, which is the correct posture for a server-side API that does
its own authorization in `requireAuth` / `requireRole`.

```
# backend/.env — a distinct variable, alongside the anon key, not replacing it
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # Project Settings > API
```

Set it as its own variable rather than pasting the service role key into
`SUPABASE_ANON_KEY`, which is what an earlier version of this document
suggested. The two are not interchangeable: `authClient()` and `scopedClient()`
in [`supabaseClient.js`](../backend/src/config/supabaseClient.js) deliberately
stay on the anon key, because sign-in and any request that must act *as the
caller* have to run under the caller's own identity, not as a superuser.

If `SUPABASE_SERVICE_ROLE_KEY` is unset the server still boots, on the anon key,
and warns at startup — the old silent-failure mode is now audible.

The service role key must **never** reach the browser. It is only safe here
because `backend/` is server-side. Do not copy it into any `VITE_*` variable —
those are compiled into the frontend bundle and shipped to every visitor.

The alternative is writing RLS policies on `users` that permit the anon role to
read and insert, but that is strictly worse: it re-exposes the table to anyone
holding the anon key, which is public by design.
