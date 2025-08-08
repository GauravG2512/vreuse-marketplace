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

// Ensure unique combination of users (order-insensitive)
chatSchema.index(
    { 'users.0': 1, 'users.1': 1 },
    { unique: true }
);

// Pre-save hook to always sort user IDs for consistent indexing
chatSchema.pre('save', function (next) {
    if (this.users && this.users.length === 2) {
        this.users = this.users.map(u => u.toString()).sort();
    }
    next();
});

// Virtual for messages (not stored in DB)
chatSchema.virtual('messages', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'chat'
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
