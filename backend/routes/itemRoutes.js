// D:\Vreuse\backend\routes\itemRoutes.js

const express = require('express');
const { createItem, getItems, getItem, deleteItem } = require('../controllers/itemController');
const requireAuth = require('../middleware/requireAuth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = file.mimetype.split('/')[1];
        cb(null, uniqueSuffix + '.' + fileExtension);
    }
});

// Create a file filter to accept only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/heic') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter // Add the file filter here
});

// Get all item listings (public)
router.get('/', getItems);

// Get a single item listing (public)
router.get('/:id', getItem);

// ===================================
// Protected Routes
// ===================================

// Middleware to protect routes below this point
router.use(requireAuth);

// Create a new item listing (private - requires login)
router.post('/', upload.single('image'), createItem);

// Delete an item listing (private - requires login)
router.delete('/:id', deleteItem);

module.exports = router;