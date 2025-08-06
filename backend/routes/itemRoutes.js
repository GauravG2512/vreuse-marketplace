// D:\Vreuse\backend\routes\itemRoutes.js

const express = require('express');
const { createItem, getItems, getItem, deleteItem } = require('../controllers/itemController');
const requireAuth = require('../middleware/requireAuth');
const multer = require('multer');
// const path = require('path'); // Removed: No longer needed for local file paths

// Cloudinary configuration
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage to use Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'vreuse_marketplace', // This is the folder where images will be stored in your Cloudinary account
        format: async (req, file) => 'png', // You can specify format or allow original
        public_id: (req, file) => `item-${Date.now()}-${file.originalname.split('.')[0]}`, // Generates a unique public_id
    },
});

// Create a file filter to accept only images (good practice)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) { // Accepts any image type (jpeg, png, etc.)
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false); // Custom error for non-image files
    }
};

// Initialize multer with the Cloudinary storage engine
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Optional: Limit file size to 5MB (5 * 1024 * 1024 bytes)
});

const router = express.Router();

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
// Use upload.single('image') to handle image upload to Cloudinary
router.post('/', upload.single('image'), createItem);

// Delete an item listing (private - requires login)
router.delete('/:id', deleteItem);

module.exports = router;
