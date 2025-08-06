// D:\Vreuse\backend\models\Chat.js

const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        validate: {
            validator: function(users) {
                return users.length === 2 && new Set(users.map(u => u.toString())).size === 2;
            },
            message: 'Chat must have exactly two distinct users'
        }
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }});

// Ensure unique pair of users
chatSchema.index({ users: 1 }, { unique: true });

// Virtual for messages (not stored in DB)
chatSchema.virtual('messages', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'chat'});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;