const express = require('express');
const routes = express.Router();
const { createCategoryController, 
        fetchAllCategoriesController,
        singleCategoryFetchController,
        updateCategoryController, 
        deleteCategoryController} = require('../../controllers/category/categoryController');
const {authentication, authorization} = require('../../middleware/auth/authMiddleware');

// create Routes
routes.post('/', authentication, authorization(["admin"]), createCategoryController);

// fetch all Routes

routes.get('/', authentication, authorization(["admin", "librarian", "member"]), fetchAllCategoriesController);

// single fetch Routes

routes.get('/:id', authentication, authorization(["admin", "librarian", "member"]), singleCategoryFetchController);

// update routes
routes.put('/:id', authentication, authorization(["admin"]), updateCategoryController);

// Delete routes
routes.delete('/:id', authentication, authorization(["admin"]), deleteCategoryController);


module.exports = routes;