require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userModel = require('../models/users/userModel');
const roleModel = require('../models/roles/roleModel');

const getDatabaseUrl = () => {
    const mode = (process.env.MODE || 'development').trim().toLowerCase();
    const databaseUrl = mode === 'production'
        ? process.env.PRD_DB_URL
        : process.env.DEV_DB_URL;

    if (!databaseUrl) {
        throw new Error(
            mode === 'production'
                ? 'PRD_DB_URL is missing from .env'
                : 'DEV_DB_URL is missing from .env'
        );
    }

    return databaseUrl;
};

const seedAdmin = async () => {
    const name = (process.env.SEED_ADMIN_NAME || '').trim();
    const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD || '';

    if (!name || !email || !password) {
        throw new Error(
            'Set SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD in your local .env before running this script.'
        );
    }

    if (password.length < 8) {
        throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters long.');
    }

    await mongoose.connect(getDatabaseUrl());
    console.log('Database connected.');

    // Ensure all built-in roles exist; safe to run more than once.
    const roleDescriptions = {
        admin: 'Administrator with full system access',
        librarian: 'Librarian who manages books and borrowings',
        member: 'Library member who can request books'
    };

    const roles = {};
    for (const [roleName, description] of Object.entries(roleDescriptions)) {
        roles[roleName] = await roleModel.findOneAndUpdate(
            { name: roleName },
            { $setOnInsert: { name: roleName, description } },
            { new: true, upsert: true, runValidators: true }
        );
    }

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
        const existingRole = await roleModel.findById(existingUser.roleId);
        if (existingRole?.name !== 'admin') {
            throw new Error(
                `The email ${email} already belongs to a non-admin account. No account changes were made; choose a different SEED_ADMIN_EMAIL.`
            );
        }

        console.log(`Admin account already exists: ${email}. No password or account details were changed.`);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await userModel.create({
        name,
        email,
        password: hashedPassword,
        roleId: roles.admin._id,
        status: 'active'
    });

    console.log(`Admin account created successfully: ${email}`);
    console.log('You can now log in through POST /api/auth/login.');
};

seedAdmin()
    .catch((error) => {
        console.error('Admin seed failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
