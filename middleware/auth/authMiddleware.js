
const jwt = require('jsonwebtoken');
const userModel = require('../../models/users/userModel');

const authentication = async (req, res, next) => {
    try {
        const token = req.headers.authorization;

        if (!token || !token.startsWith('Bearer ')) {
            return res.status(401).json({
                status: false,
                message: 'Valid authentication token required',
                data: null
            });
        }

        const authToken = token.split(' ')[1];

        if (!authToken) {
            return res.status(401).json({
                status: false,
                message: 'Token required',
                data: null
            });
        }

        const tokenVerify = jwt.verify(
            authToken,
            process.env.JWT_SECRET_KEY
        );

        const user = await userModel.findById(tokenVerify.userId);

        if (!user) {
            return res.status(401).json({
                status: false,
                message: 'User not found',
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

        req.user = tokenVerify;

        next();

    } catch (error) {
       console.error('Authorization error:', error);
        return res.status(500).json({
            status: false,
            message: 'Internal server error',
            data: null
        });
    }
};

const authorization = (roles) => {
    return (req, res, next) => {
        try {
            if (!req.user || !req.user.role) {
                return res.status(401).json({
                    status: false,
                    message: 'Authentication required',
                    data: null
                });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    status: false,
                    message: 'You do not have permission',
                    data: null
                });
            }

            next();

        } catch (error) {
            console.error('Authorization error:', error);

            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                data: null
            });
        }
    };
};

module.exports = { authentication, authorization };
