// D:\Vreuse\backend\routes\chatRoutes.js

const express = require('express');
const { getConversations, startChat, getMessages, sendMessage } = require('../controllers/chatController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Middleware to protect routes below this point
router.use(requireAuth);

// Get a list of all conversations for the logged-in user
router.get('/conversations', getConversations);

// Start or retrieve a chat between two users
router.post('/start', startChat);

// Get all messages for a specific chat
router.get('/:chatId/messages', getMessages);

// Send a new message to a specific chat
router.post('/:chatId/message', sendMessage);

module.exports = router;