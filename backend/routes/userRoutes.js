const express = require('express');
const { registerUser, loginUser, getUserProfile } = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Register a new user
router.post('/register', registerUser);

// Login a user
router.post('/login', loginUser);

// ===================================
// Protected Routes
// ===================================

// Middleware to protect routes below this point
router.use(requireAuth);

// Get user profile (private - requires login)
router.get('/profile', getUserProfile);

module.exports = router;