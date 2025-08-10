// D:\Vreuse\backend\routes\userRoutes.js

const express = require('express');
const { registerUser, loginUser, getUserProfile, updateUserProfile, deleteUserProfile, forgotPassword, resetPassword, changePassword } = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Register a new user
router.post('/register', registerUser);

// Login a user
router.post('/login', loginUser);

// Public routes for password reset
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Middleware to protect routes below this point
router.use(requireAuth);

// Get user profile (Protected)
router.get('/profile', getUserProfile);

// Update user profile (Protected)
router.put('/profile', updateUserProfile);

// Delete user profile (Protected)
router.delete('/profile', deleteUserProfile);

// Change password (Protected)
router.put('/change-password', changePassword);

module.exports = router;