const express = require('express');
const routes = express.Router();
const {bookCopyCreateController, 
    bookCopyfetchAllController, 
    bookCopysingleFetchController, 
    bookCopyupdateController, 
    bookCopydeleteController} = require('../../controllers/bookCopies/bookCopyController');
const {authentication, authorization} = require('../../middleware/auth/authMiddleware');

// create Routes
routes.post('/', authentication, authorization(["admin", "librarian"]), bookCopyCreateController);

// fetch all Routes

routes.get('/', authentication, authorization(["admin", "librarian", "member"]), bookCopyfetchAllController);

// single fetch Routes

routes.get('/:id', authentication, authorization(["admin", "librarian", "member"]), bookCopysingleFetchController);

// update routes
routes.put('/:id', authentication, authorization(["admin", "librarian"]), bookCopyupdateController);

// Delete routes
routes.delete('/:id', authentication, authorization(["admin", "librarian"]), bookCopydeleteController);


module.exports = routes;