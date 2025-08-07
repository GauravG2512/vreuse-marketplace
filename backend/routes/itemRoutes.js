// D:\\Vreuse\\backend\\routes\\itemRoutes.js

// 1. Import necessary modules
const express = require('express');
const { createItem, getItems, getItem, deleteItem } = require('../controllers/itemController');
const requireAuth = require('../middleware/requireAuth');
const multer = require('multer');

// Cloudinary configuration modules
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 2. Configure Cloudinary using environment variables
// This ensures your sensitive API keys are not hard-coded in the source.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 3. Configure multer to use Cloudinary for file storage
// This automatically handles the upload process and returns a URL.
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'vreuse_marketplace', // Specifies a folder in your Cloudinary account
        format: async (req, file) => 'png',
        public_id: (req, file) => `item-${Date.now()}-${file.originalname.split('.')[0]}`,
    },
});

// Create a file filter to accept only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Optional: Limit file size to 5MB
});

// 4. Create the router and define the routes
const router = express.Router();

// Public routes (accessible without authentication)
router.get('/', getItems);
router.get('/:id', getItem);

// Middleware to protect routes below this point
// All routes after this line require a valid JWT token.
router.use(requireAuth);

// Protected routes (require a logged-in user)
// The multer middleware `upload.single('image')` handles the file upload before the controller.
router.post('/', upload.single('image'), createItem);
router.delete('/:id', deleteItem);

// 5. Export the router for use in your main server file
module.exports = router;
