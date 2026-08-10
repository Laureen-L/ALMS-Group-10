-- =============================================================
-- ALMS — Automated Library Management System
-- Migration: add users.phone
--
-- WHY:
--   FR-19 profile editing (PUT /api/auth/profile/:id) lets a member
--   store a contact number, and the overdue SMS reminder job reads it.
--   No phone column existed in the v1.0 schema.
--
-- HOW TO RUN:
--   Paste into the Supabase SQL Editor and execute, or run
--   `npx prisma migrate deploy` if the project's DATABASE_URL is set.
-- =============================================================

-- Nullable: existing members have no number on file, and a phone
-- number is never required to use the library.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);
