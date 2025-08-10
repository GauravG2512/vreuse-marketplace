// D:\Vreuse\backend\controllers\userController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');

// A function to generate a JWT token for a user
const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: '3d' });
};

// ===================================
// User Registration
// ===================================
const registerUser = async (req, res) => {
    // Destructure user data from the request body
    const { email, password, name, role } = req.body;

    try {
        // Basic validation: Check if all required fields are provided
        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if a user with the given email already exists
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Create a new user in the database
        const user = await User.create({ email, password, name, role });

        // Create a new JWT token for the registered user
        const token = createToken(user._id);

        // Send a success response with the user's email, name, and token
        res.status(201).json({ email, name, token });

    } catch (error) {
        // Handle server errors
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// User Login
// ===================================
const loginUser = async (req, res) => {
    // Destructure email and password from the request body
    const { email, password } = req.body;

    try {
        // Basic validation: Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find the user by their email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Incorrect email' });
        }

        // Compare the provided password with the stored hashed password
        const match = await user.comparePassword(password);
        if (!match) {
            return res.status(400).json({ error: 'Incorrect password' });
        }

        // Create a JWT token for the logged-in user
        const token = createToken(user._id);

        // Send a success response with the user's email, name, and token
        res.status(200).json({ email, name: user.name, token });

    } catch (error) {
        // Handle server errors
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Get user profile (Protected)
// ===================================
const getUserProfile = async (req, res) => {
    try {
        // Find the user by ID from the authenticated request, and exclude the password field
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Send the user's profile data
        res.status(200).json(user);
    } catch (error) {
        // Handle server errors
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Update user profile (Protected)
// ===================================
const updateUserProfile = async (req, res) => {
    try {
        const { name, role } = req.body;
        const userId = req.user._id;

        // Added validation check for name and role
        if (!name || name.trim() === '' || !role || role.trim() === '') {
            return res.status(400).json({ error: 'Name and role are required' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.name = name;
        user.role = role;
        await user.save();

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Delete user profile (Protected)
// ===================================
const deleteUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await User.findByIdAndDelete(userId);

        if (!result) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, deleteUserProfile };