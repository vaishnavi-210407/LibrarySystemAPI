const express = require('express');
const routes = express.Router();
const { createRoleController, 
        fetchAllRolesController,
        singleRoleFetchController, 
        updateRoleController, 
        deleteRoleController} = require('../../controllers/role/roleController');
const {authentication, authorization} = require('../../middleware/auth/authMiddleware');

// create Routes
routes.post('/', authentication, authorization(["admin"]), createRoleController);

// fetch all Routes

routes.get('/', authentication, authorization(["admin", "librarian", "member"]), fetchAllRolesController);

// single fetch Routes

routes.get('/:id', authentication, authorization(["admin", "librarian", "member"]), singleRoleFetchController);

// update routes
routes.put('/:id', authentication, authorization(["admin"]), updateRoleController);

// Delete routes
routes.delete('/:id', authentication, authorization(["admin"]), deleteRoleController);


module.exports = routes;