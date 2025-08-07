// D:\Vreuse\backend\middleware\requireAuth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
    // Verify authentication
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authorization.split(' ')[1];

    try {
        const { _id } = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by ID and attach the full user object to the request
        // This is the most robust way to ensure the ID is available for controllers
        req.user = await User.findOne({ _id }).select('_id');
        next();

    } catch (error) {
        console.error("JWT verification failed:", error.message);
        res.status(401).json({ error: 'Request is not authorized' });
    }
};

module.exports = requireAuth;
