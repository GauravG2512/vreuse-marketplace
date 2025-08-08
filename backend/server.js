// D:\Vreuse\backend\server.js

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
const User = require('./models/User'); 

// 3. Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://vreuse.netlify.app",
        methods: ["GET", "POST"]
    }
});

// 4. Middleware
app.use(express.json()); 
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
        process.exit(1); 
    });

// === Socket.io Logic ===
const userSocketMap = new Map();
const socketUserMap = new Map();

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('joinRoom', (userId) => {
        userSocketMap.set(userId, socket.id);
        socketUserMap.set(socket.id, userId);
        console.log(`User ${userId} connected with socket ${socket.id}`);
    });

    socket.on('sendMessage', async (data) => {
        try {
            const { chatId, senderId, text } = data;

            if (!chatId || !senderId || !text) {
                console.error('Invalid message data received:', data);
                return;
            }

            const newMessage = new Message({
                chat: chatId,
                sender: senderId,
                text
            });
            await newMessage.save();

            await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id, updatedAt: Date.now() });

            // Populate the sender's email for real-time display on frontend
            const populatedMsg = await Message.populate(newMessage, { path: 'sender', select: 'email' });

            const chat = await Chat.findById(chatId);
            if (!chat) {
                console.error(`Chat with ID ${chatId} not found.`);
                return;
            }

            // Add chatId into emitted payload so frontend's message.chat check works
            const msgToSend = {
                ...populatedMsg.toObject(),
                chat: chatId
            };
            
            // Emit the message to all participants currently connected
            chat.users.forEach(userId => {
                const receiverSocketId = userSocketMap.get(userId.toString());
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receiveMessage', msgToSend);
                }
            });
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/user', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/chat', chatRoutes);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});
