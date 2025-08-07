// D:\\Vreuse\\backend\\server.js

// 1. Load environment variables
require('dotenv').config();

// 2. Import necessary packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Import your routes
const userRoutes = require('./routes/userRoutes');
const itemRoutes = require('./routes/itemRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Import your models for Socket.io use
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const User = require('./models/User'); // Ensure User model is imported for population

// 3. Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // FIX: Updated CORS origin to your Netlify frontend URL
        origin: "https://vreuse.netlify.app",
        methods: ["GET", "POST"]
    }
});

// 4. Middleware
app.use(express.json()); // For parsing application/json
// FIX: Updated CORS origin for Express routes as well
app.use(cors({
    origin: "https://vreuse.netlify.app"
}));

// 5. Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully!');
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Access it at: http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit process with failure
    });

// === Socket.io Logic ===
// Maps to keep track of which user is connected to which socket
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Event for a user joining (e.g., after login)
    socket.on('joinRoom', (userId) => {
        userSocketMap.set(userId, socket.id);
        socketUserMap.set(socket.id, userId);
        console.log(`User ${userId} connected with socket ${socket.id}`);
    });

    // Event for sending a message
    socket.on('sendMessage', async (data) => {
        try {
            const { chatId, senderId, text } = data;

            // Basic validation for message data
            if (!chatId || !senderId || !text) {
                console.error('Invalid message data received:', data);
                return;
            }

            // Create and save the new message to the database
            const newMessage = new Message({
                chat: chatId,
                sender: senderId,
                text
            });
            await newMessage.save();

            // Update the lastMessage and updatedAt fields in the Chat document
            await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id, updatedAt: Date.now() });

            // Populate the sender's email for real-time display on frontend
            const populatedMsg = await Message.populate(newMessage, { path: 'sender', select: 'email' });

            // Find the chat to get all participants
            const chat = await Chat.findById(chatId);
            if (!chat) {
                console.error(`Chat with ID ${chatId} not found.`);
                return;
            }

            // Emit the message to all participants in the chat
            chat.users.forEach(userId => {
                const receiverSocketId = userSocketMap.get(userId.toString());
                if (receiverSocketId) {
                    // Send the populated message to the receiver's socket
                    io.to(receiverSocketId).emit('receiveMessage', populatedMsg);
                }
            });
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    // Event for socket disconnection
    socket.on('disconnect', () => {
        const userId = socketUserMap.get(socket.id);
        if (userId) {
            userSocketMap.delete(userId);
            socketUserMap.delete(socket.id);
            console.log(`User ${userId} disconnected`);
        }
        console.log('Client disconnected:', socket.id);
    });
});


// === Serve the uploaded images ===
// This makes the 'uploads' directory accessible publicly via /uploads URL
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 6. Use the API routes
app.use('/api/user', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/chat', chatRoutes);

// === Serve the frontend as a single-page application ===
// Serve static files from the 'frontend' directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// For any other route, serve the index.html (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});
