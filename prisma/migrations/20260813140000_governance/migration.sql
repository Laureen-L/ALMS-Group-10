-- =============================================================
-- ALMS — Automated Library Management System
-- Migration: governance
--
-- WHY:
--   Four gaps that all trace back to the same thing — the system had
--   no memory of decisions and no place to keep policy.
--
--   1. system_settings — the loan period (14 days) and the borrow
--      limit (5) were hard-coded constants in borrowController.js.
--      Changing library policy meant changing code and redeploying.
--      An administrator should be able to set them.
--
--   2. audit_log — role promotions, deactivations and catalog
--      deletions left no trace of who did them. borrow_records
--      already stores processed_by; nothing else recorded an actor.
--      This is what separates an administrator from a librarian.
--
--   3. borrow_records.renewal_count — loans ran 14 days and then
--      went overdue, with no way to extend one. Renewals need a
--      count so the policy cap can be enforced.
--
--   4. books.withdrawn_at — librarians could hard-DELETE a catalog
--      row, which is destructive and loses loan history. They now
--      withdraw a title from circulation instead; deletion is left
--      to administrators.
--
--   Plus users.preferences, so the notification toggles on the
--   Settings screen save somewhere instead of being discarded on
--   navigation.
--
-- HOW TO RUN:
--   Paste into the Supabase SQL Editor and execute, or run
--   `npx prisma migrate deploy` if the project's DATABASE_URL is set.
--
--   Safe to re-run: every statement is guarded.
-- =============================================================


-- =============================================================
-- TABLE: system_settings
--
-- A singleton. The CHECK on the primary key means there can only
-- ever be one row, so the backend reads it with .eq('id', 1) and
-- never has to decide which row is the live one.
-- =============================================================

CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,

    -- FR-12: how long a new loan runs.
    "loan_period_days" SMALLINT NOT NULL DEFAULT 14,

    -- FR-09: how many books one member may hold at once.
    "max_active_borrows" SMALLINT NOT NULL DEFAULT 5,

    -- How many times a member may extend one loan, and by how long.
    "max_renewals" SMALLINT NOT NULL DEFAULT 2,
    "renewal_period_days" SMALLINT NOT NULL DEFAULT 7,

    -- Fines. Currency is GHS; the amount column on `fines` is
    -- NUMERIC(8,2), so this matches its scale.
    "fine_per_day" NUMERIC(8,2) NOT NULL DEFAULT 0.50,

    -- Days past the due date before a fine starts accruing.
    "fine_grace_days" SMALLINT NOT NULL DEFAULT 0,

    -- How far ahead the "due soon" desk queue looks.
    "due_soon_days" SMALLINT NOT NULL DEFAULT 3,

    -- Below this many available copies, a title shows on the
    -- low-stock report.
    "low_stock_threshold" SMALLINT NOT NULL DEFAULT 2,

    -- Who last changed policy, and when. The audit_log carries the
    -- full history; this is the quick answer for the settings screen.
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "system_settings_singleton" CHECK ("id" = 1),

    -- Nonsense policy would silently break borrowing, so the
    -- database refuses it rather than the UI alone.
    CONSTRAINT "system_settings_loan_period_positive"  CHECK ("loan_period_days" BETWEEN 1 AND 365),
    CONSTRAINT "system_settings_borrow_limit_positive" CHECK ("max_active_borrows" BETWEEN 1 AND 100),
    CONSTRAINT "system_settings_renewals_sane"         CHECK ("max_renewals" BETWEEN 0 AND 20),
    CONSTRAINT "system_settings_renewal_period_sane"   CHECK ("renewal_period_days" BETWEEN 1 AND 365),
    CONSTRAINT "system_settings_fine_not_negative"     CHECK ("fine_per_day" >= 0),
    CONSTRAINT "system_settings_grace_not_negative"    CHECK ("fine_grace_days" >= 0),
    CONSTRAINT "system_settings_due_soon_sane"         CHECK ("due_soon_days" BETWEEN 1 AND 60),
    CONSTRAINT "system_settings_low_stock_sane"        CHECK ("low_stock_threshold" >= 0)
);

-- SET NULL rather than CASCADE: policy outlives the administrator
-- who set it. Losing the row because an account was removed would
-- reset the whole library to defaults.
ALTER TABLE "system_settings"
    DROP CONSTRAINT IF EXISTS "system_settings_updated_by_fkey";
ALTER TABLE "system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the one row. Without it the first GET returns nothing and
-- the backend would have to special-case an empty table.
INSERT INTO "system_settings" ("id") VALUES (1)
ON CONFLICT ("id") DO NOTHING;


-- =============================================================
-- TABLE: audit_log
--
-- Append-only. Nothing in the application updates or deletes a row
-- here — a corrected mistake is a second entry, not an edited one.
-- =============================================================

CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    -- Who did it. SET NULL on delete, because the entry must survive
    -- the actor: "nobody did this" is a worse answer than "an account
    -- that no longer exists did this".
    "actor_id" UUID,

    -- Denormalised copies, captured at write time. The FKs above go
    -- NULL when an account is removed, and a log that then reads
    -- "someone changed a role" is worthless. These two columns are
    -- what make the entry still legible years later.
    "actor_email" VARCHAR(100),
    "actor_role"  VARCHAR(20),

    -- Dotted verb: 'member.role_changed', 'book.deleted',
    -- 'settings.updated', 'fine.waived'. VARCHAR not ENUM so a new
    -- action never needs an ALTER TYPE, which Postgres cannot run
    -- inside a transaction.
    "action" VARCHAR(60) NOT NULL,

    -- What it was done to: 'user' | 'book' | 'loan' | 'fine' | 'settings'.
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id"   UUID,

    -- Human-readable name of the target, also captured at write time
    -- and for the same reason: a deleted book's title is the only
    -- thing that makes its deletion entry mean anything.
    "entity_label" VARCHAR(255),

    -- Before/after values, free-form per action. JSONB rather than
    -- columns because every action carries different fields.
    "details" JSONB,

    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- The default view: the whole log, newest first.
CREATE INDEX IF NOT EXISTS "idx_audit_log_created"
    ON "audit_log"("created_at" DESC);

-- "What has this administrator been doing?"
CREATE INDEX IF NOT EXISTS "idx_audit_log_actor"
    ON "audit_log"("actor_id", "created_at" DESC);

-- "What has happened to this book / this member?"
CREATE INDEX IF NOT EXISTS "idx_audit_log_entity"
    ON "audit_log"("entity_type", "entity_id", "created_at" DESC);

ALTER TABLE "audit_log"
    DROP CONSTRAINT IF EXISTS "audit_log_actor_id_fkey";
ALTER TABLE "audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;


-- =============================================================
-- COLUMN: borrow_records.renewal_count
--
-- Counts extensions granted on this loan, so max_renewals can be
-- enforced. Existing loans start at 0, which is correct — none of
-- them have ever been renewed.
-- =============================================================

ALTER TABLE "borrow_records"
    ADD COLUMN IF NOT EXISTS "renewal_count" SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE "borrow_records"
    DROP CONSTRAINT IF EXISTS "borrow_records_renewal_count_not_negative";
ALTER TABLE "borrow_records"
    ADD CONSTRAINT "borrow_records_renewal_count_not_negative"
    CHECK ("renewal_count" >= 0);


-- =============================================================
-- COLUMN: books.withdrawn_at
--
-- Soft removal from circulation. NULL means the title is live.
--
-- This exists so librarians never need DELETE on a catalog row:
-- borrow_records references books with ON DELETE RESTRICT, so a
-- real delete either fails on any title that was ever borrowed, or
-- — if the history were removed first — destroys the loan record
-- the library is meant to keep.
-- =============================================================

ALTER TABLE "books"
    ADD COLUMN IF NOT EXISTS "withdrawn_at" TIMESTAMPTZ;

-- Who withdrew it. Same SET NULL reasoning as elsewhere.
ALTER TABLE "books"
    ADD COLUMN IF NOT EXISTS "withdrawn_by" UUID;

ALTER TABLE "books"
    DROP CONSTRAINT IF EXISTS "books_withdrawn_by_fkey";
ALTER TABLE "books"
    ADD CONSTRAINT "books_withdrawn_by_fkey"
    FOREIGN KEY ("withdrawn_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- The public catalog filters on this on every search, and withdrawn
-- titles are the rare case, so the index covers the live ones only.
CREATE INDEX IF NOT EXISTS "idx_books_in_circulation"
    ON "books"("id")
    WHERE "withdrawn_at" IS NULL;


-- =============================================================
-- COLUMN: users.preferences
--
-- Notification and display preferences, as JSONB. The Settings
-- screen offered five toggles that were React state and nothing
-- else — they reset the moment the user navigated away.
--
-- JSONB rather than five booleans: these are UI preferences that
-- will keep changing, and none of them are ever queried or joined
-- on. A new toggle should not need a migration.
-- =============================================================

ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "preferences" JSONB NOT NULL DEFAULT '{}'::jsonb;


-- =============================================================
-- INDEX: fines
--
-- The fines table has existed since the initial migration and has
-- never been read by any code. The fines desk queries it two ways —
-- everything unpaid, and one member's history — so both get an index
-- now that there is finally something issuing rows.
-- =============================================================

CREATE INDEX IF NOT EXISTS "idx_fines_status_issued"
    ON "fines"("status", "issued_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_fines_user"
    ON "fines"("user_id", "issued_at" DESC);
