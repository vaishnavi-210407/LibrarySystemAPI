const upload = require('../../middleware/upload/uploadMiddlerware');
const express = require('express');
const routes = express.Router();

const {
    bookCreateController,
    allBookFetchController,
    singleBookFetchController,
    bookUpdateController,
    bookDeleteController,
    searchBookController,
    filterBookController,
    sortBookController,
    paginateBookController
} = require('../../controllers/book/bookController');

const {
    authentication,
    authorization
} = require('../../middleware/auth/authMiddleware');

const allRoles = ['admin', 'librarian', 'member'];
const staffRoles = ['admin', 'librarian'];

// Create book
routes.post(
    '/',
    authentication,
    authorization(staffRoles),
    upload.single("image"),
    bookCreateController
);

// Search books
routes.get(
    '/search',
    authentication,
    authorization(allRoles),
    searchBookController
);

// Filter books
routes.get(
    '/filter',
    authentication,
    authorization(allRoles),
    filterBookController
);

// Sort books
routes.get(
    '/sort',
    authentication,
    authorization(allRoles),
    sortBookController
);

// Paginate books
routes.get(
    '/paginate',
    authentication,
    authorization(allRoles),
    paginateBookController
);

// Fetch all books
routes.get(
    '/',
    authentication,
    authorization(allRoles),
    allBookFetchController
);

// Fetch single book
routes.get(
    '/:id',
    authentication,
    authorization(allRoles),
    singleBookFetchController
);

// Update book
routes.put(
    '/:id',
    authentication,
    authorization(staffRoles),
    bookUpdateController
);

// Delete book
routes.delete(
    '/:id',
    authentication,
    authorization(staffRoles),
    bookDeleteController
);

module.exports = routes;
