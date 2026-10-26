
const mongoose = require('mongoose');
const roleModel = require('../../models/roles/roleModel');
const userModel = require('../../models/users/userModel');

const validRoles = ['admin', 'librarian', 'member'];


// Create Role
const createRoleController = async (req, res) => {
    try {
        let { name, description } = req.body;

        if (
            typeof name !== 'string' ||
            typeof description !== 'string' ||
            !name.trim() ||
            !description.trim()
        ) {
            return res.status(400).json({
                message: 'Role name and description are required',
                data: null
            });
        }

        name = name.trim().toLowerCase();
        description = description.trim();

        if (!validRoles.includes(name)) {
            return res.status(400).json({
                message: 'Invalid role name',
                data: null
            });
        }

        const existingRole = await roleModel.findOne({ name });

        if (existingRole) {
            return res.status(409).json({
                message: 'Role already exists',
                data: null
            });
        }

        const role = await roleModel.create({ name, description });

        return res.status(201).json({
            message: 'Role created successfully',
            data: role
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Role already exists',
                data: null
            });
        }

        console.error('Create role error:', error.message);

        return res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
};


// Fetch All Roles
const fetchAllRolesController = async (req, res) => {
    try {
        const roles = await roleModel.find();

        return res.status(200).json({
            message: 'All roles fetched successfully',
            data: roles
        });

    } catch (error) {
        console.error('Fetch roles error:', error.message);

        return res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
};


// Fetch Single Role
const singleRoleFetchController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid role ID',
                data: null
            });
        }

        const role = await roleModel.findById(id);

        if (!role) {
            return res.status(404).json({
                message: 'Role not found',
                data: null
            });
        }

        return res.status(200).json({
            message: 'Role fetched successfully',
            data: role
        });

    } catch (error) {
        console.error('Fetch role error:', error.message);

        return res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
};


// Update Role
const updateRoleController = async (req, res) => {
    try {
        const { id } = req.params;
        let { name, description } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid role ID',
                data: null
            });
        }

        const role = await roleModel.findById(id);

        if (!role) {
            return res.status(404).json({
                message: 'Role not found',
                data: null
            });
        }

        const updateData = {};


        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({
                    message: 'Valid role name is required.',
                    data: null
                });
            }

            name = name.trim().toLowerCase();

            if (!validRoles.includes(name)) {
                return res.status(400).json({
                    message: 'Invalid role name.',
                    data: null
                });
            }

            if (name !== role.name) {
                return res.status(400).json({
                    message: 'Built-in role names cannot be changed.',
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

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: 'Provide a field to update',
                data: null
            });
        }

        const updatedRole = await roleModel.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        return res.status(200).json({
            message: 'Role updated successfully',
            data: updatedRole
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Role already exists',
                data: null
            });
        }

        console.error('Update role error:', error.message);

        return res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
};


// Delete Role
const deleteRoleController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid role ID',
                data: null
            });
        }

        const role = await roleModel.findById(id);

        if (!role) {
            return res.status(404).json({
                message: 'Role not found',
                data: null
            });
        }


        if (validRoles.includes(role.name)) {
            return res.status(400).json({
                message: 'Built-in roles cannot be deleted.',
                data: null
            });
        }


        const usersWithRole = await userModel.findOne({
            roleId: role._id
        });

        if (usersWithRole) {
            return res.status(400).json({
                message: 'Cannot delete a role assigned to users',
                data: null
            });
        }

        await roleModel.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Role deleted successfully',
            data: role
        });

    } catch (error) {
        console.error('Delete role error:', error.message);

        return res.status(500).json({
            message: 'Internal server error',
            data: null
        });
    }
};


module.exports = {
    createRoleController,
    fetchAllRolesController,
    singleRoleFetchController,
    updateRoleController,
    deleteRoleController
};
