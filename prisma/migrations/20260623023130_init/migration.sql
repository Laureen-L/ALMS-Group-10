-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('student', 'librarian', 'admin');

-- CreateEnum
CREATE TYPE "loan_status" AS ENUM ('active', 'returned', 'overdue');

-- CreateEnum
CREATE TYPE "fine_status" AS ENUM ('unpaid', 'paid', 'waived');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'student',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "author" VARCHAR(255) NOT NULL,
    "isbn" VARCHAR(13),
    "genre" VARCHAR(100),
    "quantity" SMALLINT NOT NULL DEFAULT 1,
    "available_quantity" SMALLINT NOT NULL DEFAULT 1,
    "added_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "processed_by" UUID,
    "borrow_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "due_date" DATE NOT NULL,
    "return_date" DATE,
    "status" "loan_status" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "borrow_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "borrow_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "status" "fine_status" NOT NULL DEFAULT 'unpaid',
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_is_active" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE INDEX "idx_books_title" ON "books"("title");

-- CreateIndex
CREATE INDEX "idx_books_author" ON "books"("author");

-- CreateIndex
CREATE INDEX "idx_books_genre" ON "books"("genre");

-- CreateIndex
CREATE INDEX "idx_books_available" ON "books"("available_quantity");

-- CreateIndex
CREATE INDEX "idx_br_user_id" ON "borrow_records"("user_id");

-- CreateIndex
CREATE INDEX "idx_br_book_id" ON "borrow_records"("book_id");

-- CreateIndex
CREATE INDEX "idx_br_status" ON "borrow_records"("status");

-- CreateIndex
CREATE INDEX "idx_br_due_date" ON "borrow_records"("due_date");

-- CreateIndex
CREATE INDEX "idx_br_user_status" ON "borrow_records"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fines_borrow_id_key" ON "fines"("borrow_id");

-- CreateIndex
CREATE INDEX "idx_fines_user_id" ON "fines"("user_id");

-- CreateIndex
CREATE INDEX "idx_fines_status" ON "fines"("status");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_borrow_id_fkey" FOREIGN KEY ("borrow_id") REFERENCES "borrow_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
