
const mongoose = require('mongoose');
const userModel = require('../../models/users/userModel');
const roleModel = require('../../models/roles/roleModel');
const borrowModel = require('../../models/borrowings/borrowingModel');

// Fetch all users
const fetchAllUsersController = async (req, res) => {
    try {
        const users = await userModel
            .find()
            .select('-password')
            .populate('roleId');

        return res.status(200).json({
            status: true,
            message: 'All users fetched successfully',
            data: users
        });

    } catch (error) {
        console.error('Fetch users error:', error.message);

        return res.status(500).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};


// Fetch single user
const singleUserFetchController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid user ID',
                data: null
            });
        }

        const user = await userModel
            .findById(id)
            .select('-password')
            .populate('roleId');

        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found',
                data: null
            });
        }

        return res.status(200).json({
            status: true,
            message: 'User fetched successfully',
            data: user
        });

    } catch (error) {
        console.error('Fetch single user error:', error.message);

        return res.status(500).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};


// Update user
const updateUserController = async (req, res) => {
    try {
        const { id } = req.params;
        let { name, email, roleId, status } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid user ID',
                data: null
            });
        }

        const existingUser = await userModel.findById(id);

        if (!existingUser) {
            return res.status(404).json({
                status: false,
                message: 'User not found',
                data: null
            });
        }

        // Only update fields sent by Admin
        const updateData = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({
                    status: false,
                    message: 'Name cannot be empty',
                    data: null
                });
            }

            updateData.name = name.trim();
        }

        if (email !== undefined) {
            if (typeof email !== 'string' || !email.trim()) {
                return res.status(400).json({
                    status: false,
                    message: 'Valid email is required',
                    data: null
                });
            }

            updateData.email = email.trim().toLowerCase();

            const duplicateEmail = await userModel.findOne({
                email: updateData.email,
                _id: { $ne: id }
            });

            if (duplicateEmail) {
                return res.status(409).json({
                    status: false,
                    message: 'Email already exists',
                    data: null
                });
            }
        }

        if (roleId !== undefined) {
            if (!mongoose.isValidObjectId(roleId)) {
                return res.status(400).json({
                    status: false,
                    message: 'Invalid role ID',
                    data: null
                });
            }

            const role = await roleModel.findById(roleId);

            if (!role) {
                return res.status(404).json({
                    status: false,
                    message: 'Role not found',
                    data: null
                });
            }

            updateData.roleId = roleId;
        }

        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({
                    status: false,
                    message: 'Status must be active or inactive',
                    data: null
                });
            }

            updateData.status = status;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                status: false,
                message: 'Provide at least one valid field to update',
                data: null
            });
        }

        // Prevent removing the last active Admin
        const oldRole = await roleModel.findById(existingUser.roleId);
        const newRoleId = updateData.roleId || existingUser.roleId;
        const newRole = await roleModel.findById(newRoleId);
        const newStatus = updateData.status || existingUser.status;

        if (
            oldRole &&
            oldRole.name === 'admin' &&
            (newRole.name !== 'admin' || newStatus !== 'active') &&
            existingUser.status === 'active'
        ) {
            const activeAdminCount = await userModel.countDocuments({
                roleId: existingUser.roleId,
                status: 'active'
            });

            if (activeAdminCount <= 1) {
                return res.status(400).json({
                    status: false,
                    message: 'At least one active Admin must remain',
                    data: null
                });
            }
        }

        const updatedUser = await userModel
            .findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true
            })
            .select('-password')
            .populate('roleId');

        return res.status(200).json({
            status: true,
            message: 'User updated successfully',
            data: updatedUser
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                status: false,
                message: 'Email already exists',
                data: null
            });
        }

        console.error('Update user error:', error.message);

        return res.status(500).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};


// Delete user
const deleteUserController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid user ID',
                data: null
            });
        }

        if (req.user.userId === id) {
            return res.status(400).json({
                status: false,
                message: 'You cannot delete your own account',
                data: null
            });
        }

        const user = await userModel.findById(id);

        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found',
                data: null
            });
        }

        const role = await roleModel.findById(user.roleId);

        if (role && role.name === 'admin' && user.status === 'active') {
            const activeAdminCount = await userModel.countDocuments({
                roleId: user.roleId,
                status: 'active'
            });

            if (activeAdminCount <= 1) {
                return res.status(400).json({
                    status: false,
                    message: 'At least one active Admin must remain',
                    data: null
                });
            }
        }

        // Keep users who have borrowing history
        const borrowingHistory = await borrowModel.findOne({
            $or: [
                { memberId: id },
                { librarianId: id }
            ]
        });

        if (borrowingHistory) {
            return res.status(400).json({
                status: false,
                message: 'Cannot delete a user with borrowing history. Set the account to inactive instead.',
                data: null
            });
        }

        const deletedUser = await userModel
            .findByIdAndDelete(id)
            .select('-password');

        return res.status(200).json({
            status: true,
            message: 'User deleted successfully',
            data: deletedUser
        });

    } catch (error) {
        console.error('Delete user error:', error.message);

        return res.status(500).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};


module.exports = {
    fetchAllUsersController,
    singleUserFetchController,
    updateUserController,
    deleteUserController
};
