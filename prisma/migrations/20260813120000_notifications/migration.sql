-- =============================================================
-- ALMS — Automated Library Management System
-- Migration: notifications
--
-- WHY:
--   Overdue notices went out by SMS only, so the whole feature sat
--   dead behind a Termii API key and an approved sender ID. An
--   in-app notice needs no third party, so a member is still told
--   their book is late while SMS is unavailable — and afterwards
--   SMS becomes the second channel rather than the only one.
--
-- HOW TO RUN:
--   Paste into the Supabase SQL Editor and execute, or run
--   `npx prisma migrate deploy` if the project's DATABASE_URL is set.
-- =============================================================

CREATE TABLE IF NOT EXISTS "notifications" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID NOT NULL,

    -- Shown as the headline in the notification list.
    "title"      VARCHAR(150) NOT NULL,

    -- The full message. Mirrors the SMS wording so a member who gets
    -- both doesn't read two differently-worded versions of one notice.
    "body"       TEXT NOT NULL,

    -- What produced this notice. VARCHAR rather than an ENUM: new kinds
    -- (due-soon, reservation ready) should not each need a migration to
    -- ALTER TYPE, which Postgres cannot do inside a transaction.
    "type"       VARCHAR(30) NOT NULL DEFAULT 'general',

    -- The loan this notice is about, when there is one.
    "borrow_id"  UUID,

    -- NULL until the member opens it. Doubles as the unread flag, so
    -- there is no separate boolean to keep in step with a timestamp.
    "read_at"    TIMESTAMPTZ,

    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- The inbox: one member's notices, newest first.
CREATE INDEX IF NOT EXISTS "idx_notifications_user_created"
    ON "notifications"("user_id", "created_at" DESC);

-- The unread badge is read on every page load, so it gets its own
-- partial index rather than scanning the member's whole history.
CREATE INDEX IF NOT EXISTS "idx_notifications_unread"
    ON "notifications"("user_id")
    WHERE "read_at" IS NULL;

-- Re-running the reminder job must not stack identical unread notices:
-- a librarian clicking "Send reminders" twice in a morning would
-- otherwise give every overdue member two of everything.
--
-- Scoped to unread rows on purpose. Once the member has read the notice,
-- a fresh one is allowed — a book still overdue next week warrants
-- telling them again.
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_unread_per_loan_key"
    ON "notifications"("borrow_id", "type")
    WHERE "read_at" IS NULL AND "borrow_id" IS NOT NULL;

-- The constraints are guarded rather than bare ALTERs: everything above
-- uses IF NOT EXISTS, and ADD CONSTRAINT has no such form, so without
-- these blocks re-running the file would fail on an already-migrated
-- database. Migrations here are applied by hand via the SQL Editor, which
-- makes "run it twice by accident" a realistic way to lose an afternoon.

-- CASCADE: a notification is a pointer, not a record worth keeping once
-- the member is gone. Same reasoning as favorites, and deliberately
-- unlike borrow_records, which uses RESTRICT to preserve loan history.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE "notifications"
            ADD CONSTRAINT "notifications_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- SET NULL, not CASCADE: if the loan record is ever removed, the notice
-- the member already received still happened and should still be
-- readable. It just stops linking anywhere.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_borrow_id_fkey'
    ) THEN
        ALTER TABLE "notifications"
            ADD CONSTRAINT "notifications_borrow_id_fkey"
            FOREIGN KEY ("borrow_id") REFERENCES "borrow_records"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Supabase serves the table through PostgREST, which caches the schema.
-- Without this the API answers "relation does not exist" until the cache
-- happens to refresh, which looks exactly like the migration not working.
NOTIFY pgrst, 'reload schema';
