// D:\\Vreuse\\backend\\controllers\\itemController.js

const Item = require('../models/Item');
const User = require('../models/User');
const { log } = require('console');

// ===================================
// Create a new item listing
// ===================================
const createItem = async (req, res) => {
    const userId = req.user._id;
    const { title, description, category, pickupLocation, price } = req.body;
    
    // FIX: Get the image URL from req.file.path, which is set by multer-storage-cloudinary
    const image = req.file ? req.file.path : null;

    if (!image) {
        return res.status(400).json({ error: 'Image file is required' });
    }
    if (!price) {
        return res.status(400).json({ error: 'Price is required' });
    }

    try {
        const newItem = new Item({
            user: userId,
            title,
            description,
            category,
            pickupLocation,
            price,
            image, // This will now store the Cloudinary URL
        });

        await newItem.save();
        res.status(201).json(newItem);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// ===================================
// Get all item listings with filters and search
// ===================================
const getItems = async (req, res) => {
    try {
        const { search, category, sort } = req.query;
        let query = {};
        let sortOptions = {};

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        if (category) {
            query.category = category;
        }

        if (sort === 'low_to_high') {
            sortOptions.price = 1;
        } else if (sort === 'high_to_low') {
            sortOptions.price = -1;
        } else {
            sortOptions.createdAt = -1; // Default to newest first
        }

        const items = await Item.find(query).sort(sortOptions).populate('user', 'email');
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Get a single item listing by ID
// ===================================
const getItem = async (req, res) => {
    const { id } = req.params;

    try {
        const item = await Item.findById(id).populate('user', 'email');
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Delete an item listing (Protected)
// ===================================
const deleteItem = async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    try {
        const item = await Item.findById(id);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        if (item.user.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'You are not authorized to delete this item' });
        }

        await Item.deleteOne({ _id: id });
        res.status(200).json({ message: 'Item deleted successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createItem,
    getItems,
    getItem,
    deleteItem,
};
