// D:\Vreuse\backend\models\Chat.js

const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    users: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }
        ],
        validate: {
            validator: function (arr) {
                return Array.isArray(arr) &&
                       arr.length === 2 &&
                       arr[0].toString() !== arr[1].toString();
            },
            message: 'Chat must have exactly two distinct users'
        }
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Ensure unique pair of users (order-insensitive)
chatSchema.index({ users: 1 }, { unique: true });

// Virtual for messages (not stored in DB)
chatSchema.virtual('messages', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'chat'
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
