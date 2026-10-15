# Library Management System API

A RESTful backend API for managing a library, built using **Node.js, Express.js, and MongoDB**. The system supports user authentication, role-based authorization, book management, borrowing requests, book returns, and fine management.

## Features

- User registration and login using JWT authentication
- Role-based access control for Admin, Librarian, and Member
- Role and category management
- Book and book-copy management
- Borrowing requests and approvals
- Borrowing request rejection
- Book issuing and returning
- Member borrowing history
- Fine management
- Admin seed script for initial setup

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Token (JWT)
- bcrypt
- dotenv

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/vaishnavi-210407/LibrarySystemAPI
cd LibrarySystemAPI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and configure:

```env
PORT=5000
MODE=development
JWT_SECRET_KEY=your_secret_key
DEV_DB_URL=mongodb://127.0.0.1:27017/librarysystem
PRD_DB_URL=your_production_database_url

SEED_ADMIN_NAME=Library Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=your_strong_password
```

Update these values according to your environment. Never upload real credentials or secrets to GitHub.

### 4. Start MongoDB

Make sure MongoDB is installed and running on your system.

### 5. Seed the Admin Account

Configure the admin details in `.env`, then run:

```bash
npm run seed:admin
```

This script creates the default roles if needed and creates the initial administrator account if it does not already exist.

### 6. Run the Server

Development mode:

```bash
npm run dev
```

Production or normal mode:

```bash
npm start
```

By default, the API runs at:

`http://localhost:5000`

Use the port configured in your `.env` file if it differs.

## API Base URL

```text
http://localhost:5000/api
```

## API Routes

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/registration` | Register a user |
| POST | `/api/auth/login` | Log in and receive an authentication token |

### Roles

Base path: `/api/role`

Supports creating, listing, viewing, updating, and deleting roles according to the configured permissions.

### Categories

Base path: `/api/category`

Supports category management for library books.

### Users

Base path: `/api/user`

Supports user management according to role permissions.

### Books

Base path: `/api/book`

Supports book management and retrieval.

### Book Copies

Base path: `/api/bookcopy`

Supports management of individual physical copies of books.

### Borrowings

Base path: `/api/borrowing`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/borrowing/request` | Submit a borrowing request |
| GET | `/api/borrowing/pending` | Fetch pending requests |
| PUT | `/api/borrowing/approve/:id` | Approve a borrowing request |
| PUT | `/api/borrowing/reject/:id` | Reject a borrowing request |
| POST | `/api/borrowing/` | Directly issue a book |
| PUT | `/api/borrowing/return/:id` | Process a book return |
| GET | `/api/borrowing/my-borrowings` | Fetch the member's borrowings |
| GET | `/api/borrowing/my-current` | Fetch current unreturned borrowings |
| GET | `/api/borrowing/my-history` | Fetch returned borrowing history |
| GET | `/api/borrowing/` | Fetch borrowing records |
| GET | `/api/borrowing/:id` | Fetch one borrowing record |
| PUT | `/api/borrowing/:id` | Update a borrowing record |
| DELETE | `/api/borrowing/:id` | Delete a borrowing record, subject to controller rules |

Replace `:id` with the actual MongoDB document ID.

### Fines

Base path: `/api/fine`

Supports fine-related operations according to the routes and permissions defined in the project.

For exact request body fields and all route details, refer to the route files and controllers in the source code.

## Authentication in Postman

1. Start the backend server.
2. Register a user or use the seeded administrator account.
3. Log in through the login endpoint.
4. Copy the JWT returned by the API.
5. Open a protected request in Postman.
6. Select **Authorization → Bearer Token**.
7. Paste the token and send the request.

Use the correct account role for each protected endpoint.

## Project Structure

```text
LibrarySystemAPI/
├── config/
├── controllers/
│   ├── authentication/
│   ├── book/
│   ├── bookCopies/
│   ├── borrowings/
│   ├── category/
│   ├── fines/
│   ├── role/
│   └── user/
├── middleware/
│   └── auth/
├── models/
│   ├── bookCopies/
│   ├── books/
│   ├── borrowings/
│   ├── category/
│   ├── fines/
│   ├── roles/
│   └── users/
├── routes/
├── scripts/
│   └── seedAdmin.js
├── .env.example
├── package.json
└── server.js
```

## Important Notes

- Keep your `.env` file private.
- Use a strong JWT secret.
- Use appropriate roles when testing protected routes.
- Use safe test data when testing delete operations.
- The book-return controller uses MongoDB transactions. Transactions require a replica set or a sharded cluster; a standalone MongoDB instance may produce a transaction error.
- The `npm test` script is currently a placeholder and does not run automated tests.

## License

This project declares the ISC license in `package.json`.
