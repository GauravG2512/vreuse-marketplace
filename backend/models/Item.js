// D:\Vreuse\backend\models\Item.js

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        maxlength: 500
    },
    category: {
        type: String,
        required: true,
        enum: ['Books', 'Lab Kits', 'Electronics', 'Free Stuff', 'Other']
    },
    pickupLocation: {
        type: String,
        required: true,
    },
    price: { // New price field
        type: Number,
        required: true
    },
    image: {
        type: String, // We will store the file path or URL of the image
        required: true
    },
    isClaimed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;