const express = require('express');
const routes = express.Router();
const { createFineController, 
        fetchMyFineController,
        fetchAllFinesController,
        singleFineFetchController, 
        updateFineController, 
        deleteFineController} = require('../../controllers/fines/fineController');
const {authentication, authorization} = require('../../middleware/auth/authMiddleware');

// create Routes
routes.post('/', authentication, authorization(["admin", "librarian"]), createFineController);

// Member's own fines

routes.get('/my-fines', authentication, authorization(["member"]), fetchMyFineController);

// fetch all Routes

routes.get('/', authentication, authorization(["admin", "librarian", "member"]), fetchAllFinesController);

// single fetch Routes

routes.get('/:id', authentication, authorization(["admin", "librarian", "member"]), singleFineFetchController);

// update routes
routes.put('/:id', authentication, authorization(["admin", "librarian"]), updateFineController);

// Delete routes
routes.delete('/:id', authentication, authorization(["admin", "librarian"]), deleteFineController);


module.exports = routes;