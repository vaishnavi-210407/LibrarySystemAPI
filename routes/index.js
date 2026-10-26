const express = require('express');
const routes = express.Router();

const authRoutes = require('./authentication/authRoutes');
const roleRoutes =  require('./roleRoutes/roleRoutes');
const categoryRoutes = require('./categoriesRoutes/categoriesRoutes');
const userRoutes = require('./userRoutes/userRoutes');
const bookRoutes = require('./bookRoutes/bookRoutes');
const bookCopyRoutes = require('./bookCopieRoutes/bookCopiesRoutes');
const borrowingRoutes = require('./borrowingRoutes/borrowingRoutes');
const fineRoutes = require('./fineRoutes/fineRoutes');

// authentication
routes.use('/auth', authRoutes);

// Roles
routes.use('/role', roleRoutes);

// category
routes.use('/category', categoryRoutes);

// user
routes.use('/user', userRoutes);

// books
routes.use('/book', bookRoutes);

// bookCopy
routes.use('/bookcopy', bookCopyRoutes);

// borrowing
routes.use('/borrowing', borrowingRoutes);

// fines
routes.use('/fine', fineRoutes);


module.exports = routes;