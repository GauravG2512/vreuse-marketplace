// D:\Vreuse\backend\models\Message.js

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
        index: true // Add index for better performance
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
        maxlength: 1000
    },
    read: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add index for frequently queried fields
messageSchema.index({ chat: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;