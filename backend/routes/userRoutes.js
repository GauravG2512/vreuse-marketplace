// D:\Vreuse\backend\routes\userRoutes.js

const express = require('express');
const { registerUser, loginUser, getUserProfile, updateUserProfile, deleteUserProfile } = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Register a new user
router.post('/register', registerUser);

// Login a user
router.post('/login', loginUser);

// Middleware to protect routes below this point
router.use(requireAuth);

// Get user profile (Protected)
router.get('/profile', getUserProfile);

// Update user profile (Protected)
router.put('/profile', updateUserProfile);

// Delete user profile (Protected)
router.delete('/profile', deleteUserProfile);

module.exports = router;