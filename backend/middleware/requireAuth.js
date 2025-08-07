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

        // Find the user by ID and attach the full user object to the request.
        // We now explicitly select the _id to ensure it's available.
        req.user = await User.findOne({ _id }).select('+_id');
        
        if (!req.user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        next();

    } catch (error) {
        console.error("JWT verification failed:", error.message);
        res.status(401).json({ error: 'Request is not authorized' });
    }
};

module.exports = requireAuth;