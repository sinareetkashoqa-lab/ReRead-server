# 📚 ReRead - Backend

This is the **backend** for the full stack ReRead library application. It provides APIs for authentication, books, borrow requests, user profiles, reviews, and admin management.

## 🏗️ Tech Stack

- Node.js + Express
- PostgreSQL (via `pg`)
- `dotenv`, `cors`, `morgan`

## 🚀 Getting Started

```bash
# 1. Install dependencies
cd reread-server
npm install

# 2. Create a PostgreSQL database (e.g., `reread`)

# 3. Create a .env file (see .env.sample for reference):

# 4. Start the server
npm start

```

## 🗂️ Project Structure
```
reread-server/
├── routes/
│ ├── auth.js
│ ├── books.js
│ ├── borrow.js
│ ├── users.js 
│ ├── reviews.js 
│ └── admin.js 
|
├── middleware/
│ └── adminAuth.js 
|
├── db/
│ └── db.js 
|
├── schema.sql 
└── server.js
```

## 📡 API Endpoints

The API will run on: `http://localhost:5000`

### 🔐 Auth Routes

**Base URL**: `/api/auth`

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST | `/register` | Registers a new user |
| POST | `/login` | Logs in an existing user |

#### 🔸 POST `/api/auth/register`

Registers a new user (role defaults to `user`).

```json
{
  "username": "sarah_reader",
  "email": "sarah@email.com",
  "password": "password123",
  "fullName": "Sarah Ahmed",
  "location": "Amman, Jordan"
}
```

#### 🔸 POST `/api/auth/login`

Logs in an existing user.

```json
{
  "email": "sarah@email.com",
  "password": "password123"
}
```

---

### 📖 Book Routes

**Base URL**: `/api/books`

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/` | Get all books |
| GET | `/my-books` | Get the logged-in user's own books |
| GET | `/search?q=` | Search Google Books by title (used to auto-fill Add Book) |
| GET | `/fetch-isbn/:isbn` | Look up a book by ISBN via Google Books |
| GET | `/:id` | Get a single book by id |
| POST | `/` | Add a new book |
| PUT | `/:id` | Update a book (owner only) |
| DELETE | `/:id` | Delete a book (owner or admin) |



### 🔐 Requests that need to know who's making them must include:

user-id: <the logged-in user's id>
 


#### 🔸 POST `/api/books`

```json
{
  "title": "The Hobbit",
  "author": "J.R.R. Tolkien",
  "genre": "Fantasy",
  "isbn": "9780547928227",
  "description": "A hobbit sets out on an unexpected journey.",
  "condition": "Good",
  "cover_image_url": "https://example.com/cover.jpg",
  "owner_notes": "Slight wear on the cover"
}
```

#### 🔸 PUT `/api/books/:id`

```json
{
  "condition": "Fair",
  "owner_notes": "Updated notes"
}
```

---

### 🔄 Borrow Request Routes

**Base URL**: `/api/borrow-requests`

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST | `/` | Send a borrow request for a book |
| GET | `/` | Get requests sent by the logged-in user |
| GET | `/received` | Get requests received by the logged-in user (as owner) |
| PUT | `/:id/approve` | Approve a pending request (owner only) |
| PUT | `/:id/decline` | Decline a pending request (owner only) |
| PUT | `/:id/return` | Mark an approved request as returned (owner only) |
| DELETE | `/:id` | Cancel a pending request (requester or admin) |

### 🔐 All routes require the `user-id` header.

#### 🔸 POST `/api/borrow-requests`

```json
{
  "book_id": 4,
  "message": "Hi! Could I borrow this next week?"
}
```

---

### 👤 User Routes

**Base URL**: `/api/users`

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/profile` | Get the logged-in user's profile |
| PUT | `/profile` | Update the logged-in user's profile |
| DELETE | `/profile` | Delete the logged-in user's account |
| GET | `/stats` | Get the logged-in user's dashboard stats |

### 🔐 All routes require the `user-id` header.

#### 🔸 PUT `/api/users/profile`

```json
{
  "full_name": "Sarah Ahmed",
  "username": "sarah_reader",
  "email": "sarah@email.com",
  "location": "Amman, Jordan",
  "bio": "Book lover and weekend reader."
}
```

---

### ⭐ Review Routes

**Base URL**: `/api/reviews`

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/book/:bookId` | Get all reviews for a book |
| POST | `/` | Add a review (must have an approved borrow of that book) |
| DELETE | `/:id` | Delete a review (owner or admin) |

### 🔐 `POST` and `DELETE` require the `user-id` header.

#### 🔸 POST `/api/reviews`

```json
{
  "book_id": 4,
  "comment": "Great condition, exactly as described!"
}
```

---

### 🛠️ Admin Routes

**Base URL**: `/api/admin`

### 🔐 **Admin requests must include:**
x-role: admin

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/stats` | Get platform-wide stats |
| GET | `/users` | Get all users |
| PUT | `/users/:id/suspend` | Suspend or unsuspend a user |
| DELETE | `/users/:id` | Delete a user |
| GET | `/books` | Get all books |
| DELETE | `/books/:id` | Delete a book |
| GET | `/requests` | Get all borrow requests |
| DELETE | `/requests/:id` | Delete a borrow request |