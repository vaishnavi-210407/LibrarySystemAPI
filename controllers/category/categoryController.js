
const mongoose = require('mongoose');
const categoryModel = require('../../models/category/categoryModel');
const bookModel = require('../../models/books/bookModel');


// Create Category
const createCategoryController = async (req, res) => {
    try {
        let { name, description } = req.body;

        if (
            typeof name !== 'string' ||
            typeof description !== 'string' ||
            !name.trim() ||
            !description.trim()
        ) {
            return res.status(400).json({
                message: 'Category name and description are required',
                data: null
            });
        }

        name = name.trim();
        description = description.trim();

        const existingCategory = await categoryModel.findOne({
            name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        });

        if (existingCategory) {
            return res.status(409).json({
                message: 'Category already exists',
                data: null
            });
        }

        const category = await categoryModel.create({
            name,
            description
        });

        return res.status(201).json({
            message: 'Category created successfully',
            data: category
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Category already exists',
                data: null
            });
        }

        console.error('Create category error:', error.message);

        return res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
};


// Fetch All Categories

const fetchAllCategoriesController = async (req, res) => {
    try {
        let query = {};

        if (req.user.role !== 'admin') {
            query.status = 'active';
        }

        const categories = await categoryModel.find(query)
            .sort({ name: 1 });

        return res.status(200).json({
            message: 'Categories fetched successfully.',
            data: categories
        });
    } catch (error) {
        console.error('Fetch categories error:', error.message);

        return res.status(500).json({
            message: 'Internal server error.',
            data: null
        });
    }
};



// Fetch Single Category

const singleCategoryFetchController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid category ID.',
                data: null
            });
        }

        const category = await categoryModel.findById(id);

        if (!category) {
            return res.status(404).json({
                message: 'Category not found.',
                data: null
            });
        }

        if (
            category.status === 'inactive' &&
            req.user.role !== 'admin'
        ) {
            return res.status(404).json({
                message: 'Category not found.',
                data: null
            });
        }

        return res.status(200).json({
            message: 'Category fetched successfully.',
            data: category
        });
    } catch (error) {
        console.error('Fetch category error:', error.message);

        return res.status(500).json({
            message: 'Internal server error.',
            data: null
        });
    }
};



// Update Category
const updateCategoryController = async (req, res) => {
    try {
        const { id } = req.params;
        let { name, description, status } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid category ID',
                data: null
            });
        }

        const category = await categoryModel.findById(id);

        if (!category) {
            return res.status(404).json({
                message: 'Category not found',
                data: null
            });
        }

        const updateData = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({
                    message: 'Category name cannot be empty',
                    data: null
                });
            }

            name = name.trim();

            const duplicateCategory = await categoryModel.findOne({
                name: {
                    $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                    $options: 'i'
                },
                _id: { $ne: id }
            });

            if (duplicateCategory) {
                return res.status(409).json({
                    message: 'Category name already exists',
                    data: null
                });
            }

            updateData.name = name;
        }

        if (description !== undefined) {
            if (
                typeof description !== 'string' ||
                !description.trim()
            ) {
                return res.status(400).json({
                    message: 'Description cannot be empty',
                    data: null
                });
            }

            updateData.description = description.trim();
        }

        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({
                    message: 'Status must be active or inactive',
                    data: null
                });
            }

            updateData.status = status;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: 'Provide at least one field to update',
                data: null
            });
        }

        const updatedCategory = await categoryModel.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        return res.status(200).json({
            message: 'Category updated successfully',
            data: updatedCategory
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Category name already exists',
                data: null
            });
        }

        console.error('Update category error:', error.message);

        return res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
};


// Delete Category
const deleteCategoryController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid category ID',
                data: null
            });
        }

        const category = await categoryModel.findById(id);

        if (!category) {
            return res.status(404).json({
                message: 'Category not found',
                data: null
            });
        }

        const linkedBook = await bookModel.findOne({
            categoryId: id
        });

        if (linkedBook) {
            return res.status(400).json({
                message: 'Cannot delete a category that has books. Move or remove its books first.',
                data: null
            });
        }

        await categoryModel.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Category deleted successfully',
            data: category
        });

    } catch (error) {
        console.error('Delete category error:', error.message);

        return res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
};


module.exports = {
    createCategoryController,
    fetchAllCategoriesController,
    singleCategoryFetchController,
    updateCategoryController,
    deleteCategoryController
};
