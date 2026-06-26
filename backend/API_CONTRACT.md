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


#                               Dev B: