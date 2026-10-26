
const express = require('express');
const routes = express.Router();

const {
    createBorrowController,
    fetchAllBorrowController,
    singleBorrowFetchController,
    updateBorrowController,
    deleteBorrowController,
    returnBorrowController,
    createBorrowRequestController,
    fetchPendingBorrowRequestController,
    approveBorrowRequestController,
    rejectBorrowRequestController, // New
    fetchMyBorrowController,
    fetchMyCurrentBorrowController,
    fetchMyBorrowHistoryController
} = require('../../controllers/borrowings/borrowController');

const {
    authentication,
    authorization
} = require('../../middleware/auth/authMiddleware');

// Member requests a book
routes.post(
    '/request',
    authentication,
    authorization(["member"]),
    createBorrowRequestController
);

// Admin/Librarian fetch pending requests
routes.get(
    '/pending',
    authentication,
    authorization(["admin", "librarian"]),
    fetchPendingBorrowRequestController
);

// Admin/Librarian approves a request
routes.put(
    '/approve/:id',
    authentication,
    authorization(["admin", "librarian"]),
    approveBorrowRequestController
);

// Admin/Librarian rejects a borrowing request
routes.put(
    '/reject/:id',
    authentication,
    authorization(["admin", "librarian"]),
    rejectBorrowRequestController
);

// Admin/Librarian directly issues a book
routes.post(
    '/',
    authentication,
    authorization(["admin", "librarian"]),
    createBorrowController
);

// Admin/Librarian returns a book
routes.put(
    '/return/:id',
    authentication,
    authorization(["admin", "librarian"]),
    returnBorrowController
);

// Member's complete borrowing list
routes.get(
    '/my-borrowings',
    authentication,
    authorization(["member"]),
    fetchMyBorrowController
);

// Member's current borrowed books
routes.get(
    '/my-current',
    authentication,
    authorization(["member"]),
    fetchMyCurrentBorrowController
);

// Member's borrowing history
routes.get(
    '/my-history',
    authentication,
    authorization(["member"]),
    fetchMyBorrowHistoryController
);

// Fetch all borrowings (members see only their own)
routes.get(
    '/',
    authentication,
    authorization(["admin", "librarian", "member"]),
    fetchAllBorrowController
);

// Fetch one borrowing
routes.get(
    '/:id',
    authentication,
    authorization(["admin", "librarian", "member"]),
    singleBorrowFetchController
);

// Update due date
routes.put(
    '/:id',
    authentication,
    authorization(["admin", "librarian"]),
    updateBorrowController
);

// Delete non-active borrowing
routes.delete(
    '/:id',
    authentication,
    authorization(["admin", "librarian"]),
    deleteBorrowController
);

module.exports = routes;
