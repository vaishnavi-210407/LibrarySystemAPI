
const bcrypt = require('bcrypt');
const userModel = require('../../models/users/userModel');
const roleModel = require('../../models/roles/roleModel');
const jwt = require('jsonwebtoken');

const registerController = async (req, res) => {
    try {
        let { name, email, password, Cpassword } = req.body;

        if (!name || !email || !password || !Cpassword) {
            return res.status(400).json({
                status: false,
                message: 'All fields are required',
                data: null
            });
        }

        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            typeof Cpassword !== 'string'
        ) {
            return res.status(400).json({
                status: false,
                message: 'Invalid input format',
                data: null
            });
        }

        name = name.trim();
        email = email.trim().toLowerCase();

        if (!name || !email || password.length < 8) {
            return res.status(400).json({
                status: false,
                message: 'Name, valid email and password of at least 8 characters are required',
                data: null
            });
        }

        if (password !== Cpassword) {
            return res.status(400).json({
                status: false,
                message: "Passwords don't match",
                data: null
            });
        }

        const user = await userModel.findOne({ email });

        if (user) {
            return res.status(409).json({
                status: false,
                message: 'User already exists',
                data: null
            });
        }

        const memberRole = await roleModel.findOne({
            name: 'member'
        });

        if (!memberRole) {
            return res.status(500).json({
                status: false,
                message: 'Member role is not configured',
                data: null
            });
        }

        const hashpassword = await bcrypt.hash(password, 12);

        const registerUser = await userModel.create({
            name,
            email,
            password: hashpassword,
            roleId: memberRole._id,
            status: 'active'
        });

        return res.status(201).json({
            status: true,
            message: 'User registered successfully',
            data: {
                _id: registerUser._id,
                name: registerUser.name,
                email: registerUser.email,
                roleId: registerUser.roleId,
                status: registerUser.status
            }
        });

    } catch (error) {
        console.error('Registration error:', error.message);

        return res.status(500).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};


const loginController = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                status: false,
                message: 'Email and password are required',
                data: null
            });
        }

        email = email.trim().toLowerCase();

        const user = await userModel
            .findOne({ email })
            .populate('roleId');

        if (!user) {
            return res.status(401).json({
                status: false,
                message: 'Invalid email or password',
                data: null
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                status: false,
                message: 'Your account is inactive',
                data: null
            });
        }

        const isPassMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPassMatch) {
            return res.status(401).json({
                status: false,
                message: 'Invalid email or password',
                data: null
            });
        }

        if (!user.roleId || !user.roleId.name) {
            return res.status(403).json({
                status: false,
                message: 'User role is not configured',
                data: null
            });
        }

        if (!process.env.JWT_SECRET_KEY) {
            console.error('JWT_SECRET_KEY is not configured');

            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                data: null
            });
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                role: user.roleId.name
            },
            process.env.JWT_SECRET_KEY,
            {
                expiresIn: '1d'
            }
        );

        return res.status(200).json({
            status: true,
            message: 'User logged in successfully',
            data: token
        });

    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};


module.exports = { registerController, loginController };
