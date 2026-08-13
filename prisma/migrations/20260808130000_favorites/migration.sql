-- =============================================================
-- ALMS — Automated Library Management System
-- Migration: favorites
--
-- WHY:
--   Lets a member save books to come back to (student dashboard
--   "My Favorites" + the ☆ toggle on the book detail screen).
--   No such table existed in the v1.0 schema.
--
-- HOW TO RUN:
--   Paste into the Supabase SQL Editor and execute, or run
--   `npx prisma migrate deploy` if the project's DATABASE_URL is set.
-- =============================================================

CREATE TABLE IF NOT EXISTS "favorites" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID NOT NULL,
    "book_id"    UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- A member can favorite a given book once. The API relies on this: adding a
-- favorite twice must not create a duplicate row.
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_id_book_id_key"
    ON "favorites"("user_id", "book_id");

-- Listing one member's favorites is the only read pattern.
CREATE INDEX IF NOT EXISTS "idx_favorites_user_id" ON "favorites"("user_id");

-- CASCADE on both sides: a favorite is a pointer, not a record worth keeping
-- once either the member or the book is gone. This differs deliberately from
-- borrow_records, which uses RESTRICT to preserve loan history.
ALTER TABLE "favorites"
    ADD CONSTRAINT "favorites_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites"
    ADD CONSTRAINT "favorites_book_id_fkey"
    FOREIGN KEY ("book_id") REFERENCES "books"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
