const express = require('express');
const routes = express.Router();
const { fetchAllUsersController,
        singleUserFetchController, 
        updateUserController, 
        deleteUserController} = require('../../controllers/user/userController');
const {authentication, authorization} = require('../../middleware/auth/authMiddleware');


// fetch all Routes

routes.get('/', authentication, authorization(["admin"]), fetchAllUsersController);

// single fetch Routes

routes.get('/:id', authentication, authorization(["admin"]), singleUserFetchController);

// update routes
routes.put('/:id', authentication, authorization(["admin"]), updateUserController);

// Delete routes
routes.delete('/:id', authentication, authorization(["admin"]), deleteUserController);


module.exports = routes;