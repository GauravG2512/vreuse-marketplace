// D:\Vreuse\backend\controllers\chatController.js

const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// ===================================
// Start or retrieve a chat
// ===================================
const startChat = async (req, res) => {
    try {
        const { partnerId } = req.body;
        const userId = new mongoose.Types.ObjectId(req.user._id);

        // Validate partnerId format
        if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
            return res.status(400).json({ error: 'Invalid partner ID' });
        }

        const partnerObjectId = new mongoose.Types.ObjectId(partnerId);

        // Prevent chatting with self
        if (userId.toString() === partnerObjectId.toString()) {
            return res.status(400).json({ error: 'Cannot chat with yourself' });
        }

        // Check if partner exists
        const partner = await User.findById(partnerObjectId);
        if (!partner) {
            return res.status(404).json({ error: 'Partner user not found' });
        }

        // Debug log for troubleshooting
        console.log('startChat -> userId:', userId.toString(), 'partnerId:', partnerObjectId.toString());

        // Find or create chat
        let chat = await Chat.findOne({
            users: { $all: [userId, partnerObjectId], $size: 2 }
        }).populate('users', 'email');

        if (!chat) {
            chat = new Chat({ users: [userId, partnerObjectId] });
            await chat.save();
            chat = await Chat.populate(chat, { path: 'users', select: 'email' });
        }

        // Get messages
        const messages = await Message.find({ chat: chat._id })
            .sort({ createdAt: 1 })
            .populate('sender', 'email');

        res.status(200).json({
            chatId: chat._id,
            messages,
            partnerEmail: chat.users.find(u => u._id.toString() !== userId.toString()).email
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Get messages for a specific chat
// ===================================
const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const chat = await Chat.findById(chatId);
        if (!chat || !chat.users.includes(userId)) {
            return res.status(403).json({ error: 'Not authorized to view this chat' });
        }

        const messages = await Message.find({ chat: chatId })
            .sort({ createdAt: 1 })
            .populate('sender', 'email');
        res.status(200).json({ messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Send a message
// ===================================
const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { text } = req.body;
        const senderId = req.user._id;

        const chat = await Chat.findById(chatId);
        if (!chat || !chat.users.includes(senderId)) {
            return res.status(403).json({ error: 'Not authorized to send messages to this chat' });
        }

        const newMessage = new Message({ chat: chatId, sender: senderId, text });
        await newMessage.save();

        await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id, updatedAt: Date.now() });

        const populatedMsg = await Message.populate(newMessage, { path: 'sender', select: 'email' });

        res.status(201).json({ message: populatedMsg });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Get all conversations for a user
// ===================================
const getConversations = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);

        const conversations = await Chat.find({ users: userId })
            .populate({
                path: 'users',
                select: 'email',
                match: { _id: { $ne: userId } }
            })
            .populate({
                path: 'lastMessage',
                select: 'text createdAt'
            })
            .sort({ updatedAt: -1 });

        const filteredConversations = conversations.filter(conv =>
            conv.users.length > 0 && conv.users[0] !== null
        );

        res.status(200).json({
            conversations: filteredConversations.map(conv => ({
                _id: conv._id,
                chatPartner: conv.users[0],
                lastMessage: conv.lastMessage?.text || 'No messages yet',
                updatedAt: conv.updatedAt
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { startChat, getMessages, sendMessage, getConversations };
