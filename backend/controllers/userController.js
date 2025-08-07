// D:\Vreuse\backend\controllers\userController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');

// A function to generate a JWT token
const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: '3d' });
};

// ===================================
// User Registration
// ===================================
const registerUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Create the new user
        const user = await User.create({ email, password });

        // Create a JWT token
        const token = createToken(user._id);

        res.status(201).json({ email, token });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// User Login
// ===================================
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Incorrect email' });
        }

        // Compare the provided password with the hashed password
        const match = await user.comparePassword(password);
        if (!match) {
            return res.status(400).json({ error: 'Incorrect password' });
        }

        // Create a JWT token for the logged-in user
        const token = createToken(user._id);

        res.status(200).json({ email, token });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Get user profile (Protected)
// ===================================
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile };
