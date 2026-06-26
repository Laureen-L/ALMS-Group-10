-- =============================================================
-- ALMS — Automated Library Management System
-- Raw SQL Migration: Triggers & CHECK Constraints
-- Supabase PostgreSQL | v1.0 | June 2026
-- KNUST Computer Science Department — Group 10
--
-- PURPOSE:
-- Prisma does not generate triggers or subquery-based CHECK
-- constraints. This file must be appended to (or run after)
-- the Prisma-generated migration SQL.
--
-- HOW TO RUN:
--   Option A: Paste into Supabase SQL Editor and execute.
--   Option B: Add as a raw SQL step in your Prisma migration:
--             prisma/migrations/0001_init/migration_triggers.sql
--
-- DATA DICTIONARY REFS: §7 (Triggers), §5 (Constraints)
-- =============================================================


-- =============================================================
-- SECTION 1: ENABLE REQUIRED EXTENSIONS
-- pgcrypto supplies gen_random_uuid() used by all UUID PKs.
-- Supabase enables this by default; included here for safety.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================
-- SECTION 2: CHECK CONSTRAINTS
-- Prisma does not support all CHECK constraint shapes natively.
-- These enforce business rules at the database engine level.
-- Data Dictionary §5 — Constraints Summary.
-- =============================================================

-- books: total quantity must never go negative
ALTER TABLE books
  ADD CONSTRAINT chk_books_quantity
  CHECK (quantity >= 0);

-- books: available copies must be between 0 and total quantity
ALTER TABLE books
  ADD CONSTRAINT chk_books_avail_quantity
  CHECK (available_quantity >= 0 AND available_quantity <= quantity);

-- borrow_records: due date must be after the borrow date (FR-10)
ALTER TABLE borrow_records
  ADD CONSTRAINT chk_br_due_date
  CHECK (due_date > borrow_date);

-- borrow_records: return date (when set) must not be before borrow date (FR-11)
ALTER TABLE borrow_records
  ADD CONSTRAINT chk_br_return_date
  CHECK (return_date IS NULL OR return_date >= borrow_date);

-- fines: fine amount must be a positive value
ALTER TABLE fines
  ADD CONSTRAINT chk_fines_amount
  CHECK (amount > 0);


-- =============================================================
-- SECTION 3: TRIGGER FUNCTIONS
-- Each function is defined first, then bound to a table via
-- CREATE TRIGGER below. All triggers listed in DD §7.
-- =============================================================

-- -------------------------------------------------------------
-- 3.1  trg_set_due_date
-- SRS Ref: FR-10
-- Sets due_date = borrow_date + 14 days automatically on every
-- INSERT into borrow_records, unless the caller already supplied
-- a due_date (unlikely — included as a safety guard).
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_set_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-set if the application did not supply one.
  IF NEW.due_date IS NULL THEN
    NEW.due_date := NEW.borrow_date + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_due_date
  BEFORE INSERT ON borrow_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_due_date();


-- -------------------------------------------------------------
-- 3.2  trg_update_availability
-- SRS Ref: FR-12
-- Keeps books.available_quantity accurate after every status
-- change on borrow_records:
--   - New loan inserted (status = 'active')  → decrement
--   - Loan returned (status → 'returned')    → increment
-- Runs AFTER UPDATE so that the status change is already
-- committed to NEW before we read it.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_update_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Book is being borrowed: a new 'active' row was inserted.
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE books
    SET available_quantity = available_quantity - 1,
        updated_at         = now()
    WHERE id = NEW.book_id;

  -- Book is being returned: status changed to 'returned'.
  ELSIF TG_OP = 'UPDATE'
    AND OLD.status != 'returned'
    AND NEW.status  = 'returned'
  THEN
    UPDATE books
    SET available_quantity = available_quantity + 1,
        updated_at         = now()
    WHERE id = NEW.book_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fires on INSERT (new borrow) and UPDATE (return or status change).
CREATE TRIGGER trg_update_availability
  AFTER INSERT OR UPDATE OF status ON borrow_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_availability();


-- -------------------------------------------------------------
-- 3.3  trg_auto_overdue_fine
-- SRS Ref: FR-18
-- When a loan's status transitions to 'overdue', automatically
-- inserts a fine record into the fines table.
-- Fine amount formula: days_overdue × 0.50 GHS (DD §7).
-- The UNIQUE constraint on fines.borrow_id prevents duplicates
-- if the trigger fires more than once on the same record.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_auto_overdue_fine()
RETURNS TRIGGER AS $$
DECLARE
  v_days_overdue  INT;
  v_fine_amount   NUMERIC(8, 2);
BEGIN
  -- Only act when transitioning into 'overdue'.
  IF OLD.status != 'overdue' AND NEW.status = 'overdue' THEN

    -- Calculate how many days past due.
    v_days_overdue := (CURRENT_DATE - NEW.due_date);

    -- Fine = days overdue × 0.50 GHS. Minimum of 0.50 GHS (1 day).
    v_fine_amount := GREATEST(v_days_overdue, 1) * 0.50;

    -- Insert the fine record. ON CONFLICT DO NOTHING guards against
    -- the trigger firing twice on the same borrow_id.
    INSERT INTO fines (borrow_id, user_id, amount, status, issued_at)
    VALUES (
      NEW.id,
      NEW.user_id,
      v_fine_amount,
      'unpaid',
      now()
    )
    ON CONFLICT (borrow_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_overdue_fine
  AFTER UPDATE OF status ON borrow_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_overdue_fine();


-- -------------------------------------------------------------
-- 3.4  trg_users_updated_at
-- Keeps users.updated_at current on every row update.
-- DD §7 — maintenance trigger.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION fn_users_updated_at();


-- -------------------------------------------------------------
-- 3.5  trg_books_updated_at
-- Keeps books.updated_at current on every row update.
-- DD §7 — maintenance trigger.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION fn_books_updated_at();


-- -------------------------------------------------------------
-- 3.6  trg_borrow_updated_at
-- Keeps borrow_records.updated_at current on every row update
-- (e.g. when return_date is set or status changes to overdue).
-- DD §7 — maintenance trigger.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_borrow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_borrow_updated_at
  BEFORE UPDATE ON borrow_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_borrow_updated_at();


-- =============================================================
-- SECTION 4: DAILY OVERDUE CRON JOB
-- SRS Ref: FR-18 | Data Dictionary §7
--
-- This is NOT a trigger — it is a scheduled job that must be
-- configured separately. Two options:
--
--   Option A: Supabase pg_cron (recommended for Supabase projects)
--     Enable pg_cron in Supabase Dashboard → Database → Extensions,
--     then run the cron schedule below.
--
--   Option B: Render Cron Service
--     Set up a cron job on Render that calls a protected API
--     endpoint (e.g. POST /api/admin/mark-overdue) which runs
--     the UPDATE below from the Express.js backend.
--
-- Schedule: daily at 00:05 UTC (5 minutes past midnight).
-- =============================================================

-- OPTION A: Supabase pg_cron setup
-- Uncomment and run in Supabase SQL Editor AFTER enabling pg_cron.
-- Requires: SELECT cron.schedule(...) permissions.

/*
SELECT cron.schedule(
  'mark-overdue-loans',       -- job name (must be unique)
  '5 0 * * *',                -- cron expression: 00:05 UTC daily
  $$
    UPDATE borrow_records
    SET    status     = 'overdue',
           updated_at = now()
    WHERE  status   = 'active'
      AND  due_date < CURRENT_DATE;
  $$
);
*/

-- OPTION B: Raw SQL to run manually or via Render cron endpoint.
-- Copy this statement into your Express.js cron handler:
--
-- UPDATE borrow_records
-- SET    status     = 'overdue',
--        updated_at = now()
-- WHERE  status   = 'active'
--   AND  due_date < CURRENT_DATE;


-- =============================================================
-- END OF MIGRATION
-- All 6 triggers, 5 CHECK constraints, and cron job are defined.
-- Verify with:
--   SELECT trigger_name, event_manipulation, event_object_table
--   FROM information_schema.triggers
--   WHERE trigger_schema = 'public'
--   ORDER BY event_object_table, trigger_name;
-- =============================================================