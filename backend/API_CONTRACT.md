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