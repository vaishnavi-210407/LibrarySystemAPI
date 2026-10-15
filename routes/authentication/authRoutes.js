const express = require('express');
const routes = express.Router();
const {registerController, loginController} = require('../../controllers/authentication/authController');

routes.post('/registration', registerController);

routes.post('/login', loginController);


module.exports = routes;