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

        if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
            return res.status(400).json({ error: 'Invalid partner ID' });
        }

        const userObjectId = new mongoose.Types.ObjectId(req.user._id);
        const partnerObjectId = new mongoose.Types.ObjectId(partnerId);

        if (userObjectId.equals(partnerObjectId)) {
            return res.status(400).json({ error: 'Cannot chat with yourself' });
        }

        const partner = await User.findById(partnerObjectId);
        if (!partner) {
            return res.status(404).json({ error: 'Partner user not found' });
        }

        console.log('startChat -> userId:', userObjectId.toString(), 'partnerId:', partnerObjectId.toString());

        let chat = await Chat.findOne({
            users: { $all: [userObjectId, partnerObjectId], $size: 2 }
        }).populate('users', 'email name');

        if (!chat) {
            chat = new Chat({ users: [userObjectId, partnerObjectId] });
            await chat.save();
            chat = await Chat.populate(chat, { path: 'users', select: 'email name' });
        }

        const messages = await Message.find({ chat: chat._id })
            .sort({ createdAt: 1 })
            .populate('sender', 'email name');

        const chatPartner = chat.users.find(u => u._id.toString() !== userObjectId.toString());

        res.status(200).json({
            chatId: chat._id,
            messages,
            chatPartner
        });
    } catch (error) {
        console.error('startChat ERROR:', error);
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
            .populate('sender', 'email name');
        res.status(200).json({ messages });
    } catch (error) {
        console.error('startChat ERROR:', error);
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

        const populatedMsg = await Message.populate(newMessage, { path: 'sender', select: 'email name' });

        res.status(201).json({ message: populatedMsg });
    } catch (error) {
        console.error('startChat ERROR:', error);
    res.status(500).json({ error: error.message });
    }
};

// ===================================
// Get all conversations for a user
// ===================================
const getConversations = async (req, res) => {
    try {
        const userObjectId = new mongoose.Types.ObjectId(req.user._id);

        const conversations = await Chat.find({ users: userObjectId })
            .populate({
                path: 'users',
                select: 'email name',
                match: { _id: { $ne: userObjectId } }
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
         console.error('startChat ERROR:', error);
    res.status(500).json({ error: error.message });
    }
};

module.exports = { startChat, getMessages, sendMessage, getConversations };