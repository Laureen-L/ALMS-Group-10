#                                        Dev A:
# 📚 Academic Library Management System (ALMS) - API Contract
This document specifies the network endpoints for the authentication and user data subsystem. All requests and responses must communicate using the `application/json` content type.
---

## 🔐 Authentication Subsystem
### 1. User Login
Authenticates an institutionally pre-provisioned user (Student or Librarian) and returns a stateless Token .

* **Endpoint:** `http://localhost:5000/api/auth/login`
* **Method:** `POST`

#### Sample Request Payload
```json
{
  "email": "student@knust.edu.gh",
  "password": "StudentPass123!"
}


**Success Response** 
{
  "success": true,
  "message": "Authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "d51c100b-59ea-41c4-9f39-6be5d30dc727",
    "email": "student@knust.edu.gh",
    "role": "student"
  }
}


**Error Responses**
400 Bad Request (Missing Required Fields)
{ "success": false, "message": "Email and password are required" }

---

401 Unauthorized (Invalid Credentials)
{ "success": false, "message": "Invalid email or password" }

################################################################

## 👤 Profile Management Subsystem

### 2. Fetch User Profile
Retrieves core profile metadata from the database using the unique user identifier provided during authentication.

* **Endpoint:** `http://localhost:5000/api/auth/profile/userId`
* **Method:** `GET`
* **Auth Required:** Yes (`Bearer <token>`)

#### 🛠️ URL Parameters
* `userId` *(string, required)*: The unique Supabase Auth UUID of the user (e.g., `d51c100b-59ea-41c4-9f39-6be5d30dc727`).

#### 📥 Request Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

----
SUCCESS RESPONSE (200 OK):
{
"success": true,
"profile": {
"id": "d51c100b-59ea-41c4-9f39-6be5d30dc727",
"email": "student@knust.edu.gh",
"full_name": "Kwame Mensah",
"role": "student",
"is_active": true
}
}

----
ERROR RESPONSES:
401 Unauthorized (Missing or expired token):
{
"success": false,
"message": "Access denied. No token provided."
}

----
404 Not Found (User ID does not match any database profile):
{
"success": false,
"message": "Profile not found"
}

----
500 Internal Server Error:
{
"success": false,
"message": "Internal server error"
}



## Authentication Service

### Request Password Reset
Initiates the password recovery flow by generating a secure reset token and dispatching a recovery link to the user's registered email address.

* **URL:** `/api/auth/forgot-password`
* **Method:** `POST`
* **Auth Required:** No
* **Content-Type:** `application/json`

#### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | The registered email address of the user requesting a password reset. |

```json
{
  "email": "user@example.com"
}

##Success Response
 200 OK
{
  "message": "If the email exists, a password reset link has been sent.",
  "data": {}
}



##Error Responses 
400 BAD REQUEST(Missing required fiels in the request payload)

{
  "error": "Email is required."
}


500 INTERNAL SERVER ERROR (Network timeout or database infrastructure communication failure(smtp config issues))

{
  "error": "Failed to communicate with the Auth server.",
  "details": "Network/URL connection issue"
}



#                               Dev B:
# 📚 Books API Contract (Catalog Management)
**Developer:** Dev B  
**Base URL:** `/api/books`  
**Feature Requirements:** FR-05, FR-06, FR-07, FR-08  

---

### 1. Get All Books (with optional filters)
**Endpoint:** `GET /`  
**Query Parameters:** * `?search=` (string) - Filters by title (case-insensitive)
* `?genre=` (string) - Filters by exact genre match

**Response (200 OK):**
```json
[
  {
    "id": "uuid-string",
    "title": "The Pragmatic Programmer",
    "author": "David Thomas",
    "genre": "Technology",
    "published_year": 1999,
    "created_at": "2026-06-26T21:00:00.000Z"
  }
]
###2. Get Book by ID
Endpoint: GET /:id
Response (200 OK):
{
  "id": "uuid-string",
  "title": "The Pragmatic Programmer",
  "author": "David Thomas",
  "genre": "Technology",
  "published_year": 1999,
  "created_at": "2026-06-26T21:00:00.000Z"
}
Error Response (404 Not Found):
JSON
{
  "message": "Book not found"
}
3. Create a Book (Admin/Librarian Only)
Endpoint: POST /
Headers: Authorization: Bearer <token>
Request Body:
JSON
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "genre": "Technology",
  "published_year": 2008
}
Response (201 Created):
JSON
{
  "message": "Book created successfully",
  "book": {
    "id": "new-uuid-string",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "genre": "Technology",
    "published_year": 2008,
    "created_at": "2026-06-26T22:00:00.000Z"
  }
}
4. Update a Book (Admin/Librarian Only)
Endpoint: PUT /:id
Headers: Authorization: Bearer <token>
Request Body (Partial updates allowed):
JSON
{
  "genre": "Software Engineering"
}
Response (200 OK):
JSON
{
  "message": "Book updated successfully",
  "book": {
    "id": "uuid-string",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "genre": "Software Engineering",
    "published_year": 2008,
    "created_at": "2026-06-26T22:00:00.000Z"
  }
}
5. Delete a Book (Admin/Librarian Only)
Endpoint: DELETE /:id
Headers: Authorization: Bearer <token>
Response (200 OK):
JSON
{
  "message": "Book deleted successfully"
}


---

#                               Dev C:
# 🔄 Borrow/Return API Contract (Library Logic)
**Developer:** Dev C  
**Base URL:** `/api`  
**Feature Requirements:** FR-09, FR-10, FR-11, FR-12, FR-13  

---

### 1. Borrow a Book
**Endpoint:** `POST /api/borrow`  
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "bookId": "uuid-string"
}
```

**Success Response (201 Created):**
```json
{
  "message": "Book borrowed successfully",
  "borrow": {
    "id": "uuid-string",
    "user_id": "uuid-string",
    "book_id": "uuid-string",
    "borrow_date": "2026-07-02T00:00:00.000Z",
    "due_date": "2026-07-16T00:00:00.000Z",
    "status": "active"
  }
}
```

**Error Responses:**

400 Bad Request (Borrow limit reached)
```json
{ "error": "Borrow limit reached. You cannot have more than 5 active borrows." }
```

400 Bad Request (No copies available)
```json
{ "error": "No available copies of this book" }
```

404 Not Found (Book does not exist)
```json
{ "error": "Book not found" }
```

---

### 2. Return a Book
**Endpoint:** `POST /api/return`  
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "borrowId": "uuid-string"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Book returned successfully",
  "borrow": {
    "id": "uuid-string",
    "status": "returned",
    "return_date": "2026-07-02T00:00:00.000Z"
  }
}
```

**Error Responses:**

400 Bad Request (Already returned)
```json
{ "error": "This book has already been returned" }
```

403 Forbidden (Not your borrow record)
```json
{ "error": "This borrow record does not belong to you" }
```

404 Not Found (Borrow record does not exist)
```json
{ "error": "Borrow record not found" }
#                               Dev D:
# 📊 Dashboards & Admin API Contract
**Developer:** Dev D  
**Base URL:** `/api/admin`  
**Feature Requirements:** FR-14, FR-15, FR-16, FR-17, FR-18  

---

### 1. Student Dashboard
**Endpoint:** `GET /api/admin/student/dashboard/:id`  
**Headers:** `Authorization: Bearer <token>`

**Success Response (200 OK):**
```json
{
  "activeLoans": [
    {
      "id": "uuid-string",
      "book_id": "uuid-string",
      "borrow_date": "2026-07-02T00:00:00.000Z",
      "due_date": "2026-07-16T00:00:00.000Z",
      "status": "active",
      "books": {
        "id": "uuid-string",
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "genre": "Technology"
      }
    }
  ],
  "overdueLoans": [],
  "borrowHistory": [],
  "summary": {
    "totalActive": 1,
    "totalOverdue": 0,
    "totalBorrowed": 3
  }
}
```

---

### 2. Librarian Dashboard
**Endpoint:** `GET /api/admin/librarian/dashboard`  
**Headers:** `Authorization: Bearer <token>` (librarian or admin role)

**Success Response (200 OK):**
```json
{
  "stats": {
    "totalBooks": 240,
    "activeLoans": 32,
    "overdueLoans": 4
  },
  "recentActivity": [],
  "overdueList": []
}
```

---

### 3. Get All Members
**Endpoint:** `GET /api/admin/members`  
**Headers:** `Authorization: Bearer <token>` (admin only)

**Success Response (200 OK):**
```json
[
  {
    "id": "uuid-string",
    "full_name": "Kwame Mensah",
    "email": "student@knust.edu.gh",
    "role": "student",
    "created_at": "2026-06-26T21:00:00.000Z"
  }
]
```

---

### 4. Get All Borrow Records
**Endpoint:** `GET /api/admin/borrow-records`  
**Headers:** `Authorization: Bearer <token>` (admin or librarian)

**Success Response (200 OK):**
```json
[
  {
    "id": "uuid-string",
    "user_id": "uuid-string",
    "book_id": "uuid-string",
    "borrow_date": "2026-07-02T00:00:00.000Z",
    "due_date": "2026-07-16T00:00:00.000Z",
    "status": "active",
    "books": {
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "isbn": "978-0132350884"
    }
  }
]
```

---

### 5. Get Overdue Records
**Endpoint:** `GET /api/admin/overdue`  
**Headers:** `Authorization: Bearer <token>` (admin or librarian)

**Success Response (200 OK):**
```json
[
  {
    "id": "uuid-string",
    "user_id": "uuid-string",
    "due_date": "2026-07-01T00:00:00.000Z",
    "status": "overdue",
    "books": {
      "title": "Clean Code",
      "author": "Robert C. Martin"
    }
  }
]
```

---

### 6. Get Admin Stats (Charts)
**Endpoint:** `GET /api/admin/stats`  
**Headers:** `Authorization: Bearer <token>` (admin only)

**Success Response (200 OK):**
```json
{
  "totalBooks": 240,
  "totalMembers": 85,
  "activeLoans": 32,
  "overdueLoans": 4,
  "borrowsPerMonth": [
    { "month": "Feb", "count": 18 },
    { "month": "Mar", "count": 24 },
    { "month": "Apr", "count": 20 },
    { "month": "May", "count": 30 },
    { "month": "Jun", "count": 27 },
    { "month": "Jul", "count": 15 }
  ]
}
```

**Error Response (500):**
```json
{ "error": "Failed to fetch admin stats" }
```
```
---

#                               Priority 1–2 Additions
# 🆕 Endpoints & Behaviour Changes

> **Table naming:** this system stores members in **`public.users`**
> (`id, full_name, email, phone, role, is_active, created_at`). There is no
> `profiles` table. Requests and responses below use `full_name`, not `name`.

---

## ⚠️ Breaking change: how roles are resolved

`requireAuth` previously read the role from Supabase `user_metadata`, which is
never populated — so **every** `requireRole` check rejected **every** user,
including admins. It now loads `full_name`, `role` and `is_active` from
`public.users` and attaches them to `req.user`.

Two consequences:

* Role-guarded endpoints (`/api/admin/*`, `POST|PUT|DELETE /api/books`) now
  actually work for the correct roles.
* A member whose `is_active` is `false` receives **403** on every
  authenticated route:
  ```json
  { "message": "Forbidden: This account has been deactivated" }
  ```

---

### 1. Register a New Member
**Endpoint:** `POST /api/auth/register`
**Auth Required:** No

Creates the Supabase Auth user, then mirrors it into `public.users` using the
same `id`. `role` may be `student` or `librarian` only.

**Request Body:**
```json
{
  "full_name": "Kwame Mensah",
  "email": "student@knust.edu.gh",
  "password": "StudentPass123!",
  "role": "student"
}
```
`name` is accepted as an alias for `full_name`. `role` defaults to `student`.

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Registered successfully",
  "user": {
    "id": "d51c100b-59ea-41c4-9f39-6be5d30dc727",
    "email": "student@knust.edu.gh",
    "full_name": "Kwame Mensah",
    "role": "student"
  }
}
```

**Error Responses:**

400 Bad Request (missing fields)
```json
{ "error": "Email, password and full name are required." }
```

400 Bad Request (unsupported role)
```json
{ "error": "Role must be one of: student, librarian" }
```

403 Forbidden (self-registering as admin)
```json
{ "error": "Cannot self-register as admin" }
```

---

### 2. Fetch User Profile *(changed)*
**Endpoint:** `GET /api/auth/profile/:id`
**Auth Required:** Yes — **this route now enforces the token via middleware.**

Reads the profile identified by `:id` (previously it ignored `:id` and always
returned the token holder). A member may read only their own profile; admins
and librarians may read anyone's.

**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "d51c100b-59ea-41c4-9f39-6be5d30dc727",
    "full_name": "Kwame Mensah",
    "email": "student@knust.edu.gh",
    "phone": "0244000000",
    "role": "student",
    "is_active": true,
    "created_at": "2026-06-26T21:00:00.000Z"
  }
}
```

**Error Responses:**

403 Forbidden (reading someone else's profile as a member)
```json
{ "success": false, "message": "You can only view your own profile." }
```

404 Not Found
```json
{ "success": false, "message": "Profile not found" }
```

---

### 3. Update User Profile
**Endpoint:** `PUT /api/auth/profile/:id`
**Auth Required:** Yes

Only the fields present in the body are written. A member may edit only their
own profile; admins may edit anyone's.

> **Requires migration** `prisma/migrations/20260808120000_user_phone` —
> `users.phone` does not exist in the v1.0 schema. Run it before sending `phone`.

**Request Body:**
```json
{ "full_name": "Kwame A. Mensah", "phone": "0244000000" }
```
`name` is accepted as an alias for `full_name`.

**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "d51c100b-59ea-41c4-9f39-6be5d30dc727",
    "full_name": "Kwame A. Mensah",
    "email": "student@knust.edu.gh",
    "phone": "0244000000",
    "role": "student",
    "is_active": true
  }
}
```

**Error Responses:**

400 Bad Request (empty body)
```json
{ "success": false, "message": "Nothing to update." }
```

403 Forbidden (editing another member's profile)
```json
{ "success": false, "message": "You can only edit your own profile." }
```

---

### 4. Get Genres with Book Counts
**Endpoint:** `GET /api/books/genres`
**Auth Required:** No

Every distinct genre in the catalog with how many books it holds, sorted
alphabetically. Books with a `NULL` genre are omitted.

> **Route order matters:** `/genres` is registered *before* `/:id` in
> `bookRoutes.js`. Moving it below would make Express match it as a book id.

**Success Response (200 OK):**
```json
[
  { "genre": "Computer Science", "count": 12 },
  { "genre": "Fiction", "count": 5 }
]
```

---

### 5. Search Books by Author *(changed)*
**Endpoint:** `GET /api/books?search=`

`?search=` now matches **title OR author** (previously title only).
`?genre=` is unchanged — an exact match.

---

### 6. Get All Members *(changed)*
**Endpoint:** `GET /api/admin/members`
**Auth Required:** Yes — **`admin` or `librarian`** (was admin-only).

Librarians need the member list to run the circulation desk. Response shape
is unchanged.

---

### 7. Borrow & Overdue Records now include the member *(changed)*
**Endpoints:** `GET /api/admin/borrow-records`, `GET /api/admin/overdue`

Both now embed the borrower so the UI can show a name instead of a truncated
UUID. `borrow_records` has two foreign keys to `users` (`user_id` and
`processed_by`), so the borrower is selected explicitly via
`users!borrow_records_user_id_fkey`.

**Success Response (200 OK):**
```json
[
  {
    "id": "uuid-string",
    "user_id": "uuid-string",
    "due_date": "2026-07-01",
    "status": "overdue",
    "books": { "title": "Clean Code", "author": "Robert C. Martin", "isbn": "978-0132350884" },
    "users": { "full_name": "Kwame Mensah", "email": "student@knust.edu.gh" }
  }
]
```

---

#                               Priority 3–4 Additions
# 🆕 Circulation, Favorites, Member Admin & Reports

> **Migrations required before these work:**
> * `20260808120000_user_phone` — adds `users.phone` (profile edit + SMS)
> * `20260808130000_favorites` — creates the `favorites` table

---

## ⚠️ Breaking change: availability is now the database's job

`books.available_quantity` was being changed twice per transaction — once by
the trigger `trg_update_availability`, and again by hand in `borrowController`.
Stock therefore moved by 2 on every borrow and every return.

The manual updates have been **removed**. The trigger is now the single source
of truth. Confirm it is deployed:

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM   information_schema.triggers
WHERE  trigger_name = 'trg_update_availability';
```

If that returns no rows, run `prisma/migrations/20260623024516_triggers/migration.sql`
or availability will stop moving at all.

---

### 8. Get Popular Books
**Endpoint:** `GET /api/books/popular`
**Auth Required:** No

The 5 most-borrowed titles, all time. Registered above `/:id`, like `/genres`.

**Success Response (200 OK):**
```json
[
  {
    "id": "uuid-string",
    "title": "The Pragmatic Programmer",
    "author": "David Thomas",
    "genre": "Computer Science",
    "available_quantity": 3,
    "borrow_count": 142
  }
]
```

---

### 9. Borrow a Book *(changed — now accepts ISBN)*
**Endpoint:** `POST /api/borrow`
**Auth Required:** Yes

Identify the book by **either** `isbn` (circulation desk, scanned) **or**
`bookId` (student borrowing from the catalog). `memberEmail` lets staff borrow
on a member's behalf and is **rejected for non-staff**; when present the
transaction is stamped with `processed_by`.

**Request Body:**
```json
{ "isbn": "978-0132350884", "memberEmail": "student@knust.edu.gh" }
```
or, unchanged from before:
```json
{ "bookId": "uuid-string" }
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Book borrowed successfully",
  "borrow": {
    "id": "uuid-string",
    "user_id": "uuid-string",
    "book_id": "uuid-string",
    "processed_by": "uuid-string",
    "borrow_date": "2026-08-08",
    "due_date": "2026-08-22",
    "status": "active",
    "books": { "title": "Clean Code", "author": "Robert C. Martin", "isbn": "978-0132350884" }
  }
}
```

**Error Responses:**

400 (neither identifier given)
```json
{ "error": "Provide either isbn or bookId" }
```

400 (limit reached — now counts `active` **and** `overdue`)
```json
{ "error": "Borrow limit reached. A member cannot have more than 5 books out at once." }
```

400 (no stock)
```json
{ "error": "No copies available" }
```

400 (already holds this title)
```json
{ "error": "This member already has a copy of this book on loan" }
```

403 (non-staff passing memberEmail)
```json
{ "error": "Only staff can borrow on behalf of a member" }
```

404 — `{ "error": "Book not found" }` / `{ "error": "Member not found" }`

---

### 10. Return a Book *(changed — now accepts ISBN)*
**Endpoint:** `POST /api/return`
**Auth Required:** Yes

Identify the loan by **either** `borrowId` or `isbn`. With `isbn`, staff match
whoever currently holds the book (oldest open loan first); a member matches
only their own loan.

**Request Body:**
```json
{ "isbn": "978-0132350884" }
```
or `{ "borrowId": "uuid-string" }`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Book returned successfully",
  "borrow": {
    "id": "uuid-string",
    "status": "returned",
    "return_date": "2026-08-08",
    "books": { "title": "Clean Code", "author": "Robert C. Martin", "isbn": "978-0132350884" }
  }
}
```

**Error Responses:**

400 — `{ "error": "Provide either borrowId or isbn" }` / `{ "error": "This book has already been returned" }`
403 — `{ "error": "This borrow record does not belong to you" }`
404 — `{ "error": "No open loan found for this book" }`

---

### 11. Member Lookup
**Endpoint:** `GET /api/auth/members/lookup?email=`
**Auth Required:** Yes — **admin or librarian**

Confirms who a book is going to before the circulation desk commits the loan.
Staff-only, because it turns an email address into a member's identity.

**Success Response (200 OK):**
```json
{
  "id": "uuid-string",
  "full_name": "Kwame Mensah",
  "email": "student@knust.edu.gh",
  "role": "student",
  "is_active": true
}
```

**Error Responses:** 400 `{ "error": "An email query parameter is required" }` · 404 `{ "error": "Member not found" }`

---

### 12. Favorites
**Base:** `/api/students/:id/favorites` · **Auth Required:** Yes
A member may only act on their own list; admins may act on anyone's.

#### Get favorites — `GET`
Returns the saved **books**, newest first (not the join rows).
```json
[
  {
    "id": "uuid-string",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "genre": "Software Engineering",
    "isbn": "978-0132350884",
    "available_quantity": 2
  }
]
```

#### Add favorite — `POST`
Body `{ "book_id": "uuid-string" }` → **201** `{ "success": true }`
Idempotent: favoriting the same book twice is a no-op, not a conflict.

#### Remove favorite — `DELETE`
Body `{ "book_id": "uuid-string" }` → **200** `{ "success": true }`
> Note: this DELETE carries a **request body**.

**Error Responses:** 400 `{ "error": "book_id is required" }` · 403 `{ "error": "You can only edit your own favorites" }`

---

### 13. Change Member Role
**Endpoint:** `PUT /api/admin/members/:id/role` · **Auth:** admin only

Body `{ "role": "librarian" }` — one of `student` / `librarian` / `admin`.

**Success (200 OK):** `{ "success": true, "user": { "id": "...", "full_name": "...", "email": "...", "role": "librarian", "is_active": true } }`

**Errors:** 400 `{ "error": "Role must be one of: student, librarian, admin" }` ·
400 `{ "error": "You cannot change your own role" }` (guards against an admin
locking themselves out mid-session) · 404 `{ "error": "Member not found" }`

---

### 14. Deactivate / Reactivate a Member
**Endpoints:** `PUT /api/admin/members/:id/deactivate` · `PUT /api/admin/members/:id/reactivate`
**Auth:** admin only

Deactivation is a soft delete (`is_active = false`). It bites because
`requireAuth` rejects every request from an inactive account.

**Success (200 OK):** `{ "success": true, "user": { "id": "...", "is_active": false } }`

**Errors:**
400 `{ "error": "You cannot deactivate your own account" }`
400 `{ "error": "This member still has 2 book(s) on loan. Process the returns first." }`
— refuses while books are out, otherwise those loans can never be returned.

---

### 15. Reports
**Base:** `/api/admin/reports` · **Auth:** admin only, except `trends`
(admin **or librarian** — the librarian dashboard charts it).

> These aggregate in JS and read at most Supabase's default 1000-row page.
> Fine at the SRS scale (5,000 members / 10,000 books); past that they need
> Postgres RPCs.

| Endpoint | Returns |
| :--- | :--- |
| `GET /reports/genres` | `[{ "genre": "Fiction", "count": 12 }]` — books with no genre are grouped as `"Unclassified"`, sorted by count desc |
| `GET /reports/trends` | `[{ "month": "2026-07", "count": 24 }]` — ascending by month |
| `GET /reports/top-books` | `[{ "title": "...", "author": "...", "borrow_count": 42 }]` — top 10 |
| `GET /reports/overdue-rate` | `{ "total": 45, "overdue": 3, "rate": 6.7 }` |
| `GET /reports/top-borrowers` | `[{ "full_name": "...", "email": "...", "borrow_count": 22 }]` — top 10 |

**Note on `overdue-rate`:** `status = 'overdue'` is only stamped by the nightly
pg_cron job, so a loan can be past due while still marked `active`. This report
counts a loan as overdue if **either** its status is `overdue` **or** its
`due_date` has passed — it does not under-report between cron runs.

---

### 16. Send Overdue SMS Reminders *(stretch)*
**Endpoint:** `POST /api/admin/send-overdue-reminders` · **Auth:** admin only

Texts every member holding an overdue book, via Termii. Requires
`TERMII_API_KEY` in `.env`. Members with no `phone` are **skipped**, not failed.
One bad number does not abort the run.

**Success Response (200 OK):**
```json
{
  "success": true,
  "totalOverdue": 5,
  "remindersSent": 3,
  "skipped": [{ "loanId": "uuid-string", "reason": "No phone number on file" }],
  "failed":  [{ "loanId": "uuid-string", "reason": "Invalid phone number" }]
}
```

**Error Response (503 — not configured):**
```json
{ "error": "SMS is not configured. Set TERMII_API_KEY in the backend .env file." }
```

---

#                               Polish Pass
# 🆕 Password Management & Targeted Reminders

> **Port note:** the backend now defaults to **5001**, not 5000. macOS runs
> AirPlay Receiver on 5000, which intercepts requests and answers `403` with an
> empty body — the request never reaches Express.

---

### 17. Reset Password (completes the forgot-password flow)
**Endpoint:** `POST /api/auth/reset-password` · **Auth:** none

Authorised by the recovery token from the emailed link, not by a session.
Supabase delivers that token in the URL **fragment**
(`#access_token=…&type=recovery`), so the frontend reads the hash, not the query.

**Request Body:**
```json
{ "accessToken": "<recovery token from the link>", "newPassword": "NewPass123" }
```
`token` and `password` are accepted as aliases.

**Success (200 OK):** `{ "success": true, "message": "Password updated. You can now sign in." }`

**Errors:**
400 `{ "error": "A reset token and a new password are required." }` ·
400 `{ "error": "Password must be at least 8 characters." }` ·
401 `{ "error": "This reset link is invalid or has expired. Request a new one." }`

---

### 18. Change Password (while signed in)
**Endpoint:** `PUT /api/auth/password` · **Auth:** yes

Re-verifies the current password before changing it, so an unattended unlocked
session can't have its password silently swapped.

**Request Body:**
```json
{ "currentPassword": "OldPass123", "newPassword": "NewPass123" }
```

**Success (200 OK):** `{ "success": true, "message": "Password changed." }`

**Errors:**
400 `{ "error": "New password must be at least 8 characters." }` ·
400 `{ "error": "The new password must be different from the current one." }` ·
401 `{ "error": "Your current password is incorrect." }`

---

### 19. Overdue Reminders — now targetable *(changed)*
**Endpoint:** `POST /api/admin/send-overdue-reminders`
**Auth:** **admin or librarian** (was admin-only — librarians work the overdue desk)

**Request Body (optional):**
```json
{ "loanId": "uuid-string" }
```
Omit it to text everyone overdue. Pass one to remind a single member, which is
what the per-row "Remind" button sends.

**Error (404):** `{ "error": "That loan is not overdue." }` — only when `loanId` is given.

---

### 20. Create / Update Book *(corrected)*
**Endpoints:** `POST /api/books`, `PUT /api/books/:id`

**`published_year` does not exist** in the `books` table. The frontend used to
send it, so every save failed. Accepted fields are:

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "9780132350884",
  "genre": "Computer Science",
  "quantity": 3,
  "available_quantity": 3
}
```

`isbn` is unique when present — send `null`, not `""`, when a book has none, or
a second untitled-ISBN book will collide. Books without an ISBN cannot be
scanned at the circulation desk.
