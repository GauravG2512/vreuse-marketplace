// D:\Vreuse\backend\controllers\userController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// A function to generate a JWT token for a user
const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: '3d' });
};

// ===================================
// User Registration
// ===================================
const registerUser = async (req, res) => {
    const { email, password, name, role } = req.body;
    
    try {
        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const user = await User.create({ email, password, name, role });
        const token = createToken(user._id);
        
        res.status(201).json({ email, name, token });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// User Login
// ===================================
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Incorrect email' });
        }

        const match = await user.comparePassword(password);
        if (!match) {
            return res.status(400).json({ error: 'Incorrect password' });
        }

        const token = createToken(user._id);

        res.status(200).json({ email, name: user.name, token });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Get user profile (Protected)
// ===================================
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Update user profile (Protected)
// ===================================
const updateUserProfile = async (req, res) => {
    try {
        const { name, role } = req.body;
        const userId = req.user._id;

        if (!name || name.trim() === '' || !role || role.trim() === '') {
            return res.status(400).json({ error: 'Name and role are required' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.name = name;
        user.role = role;
        await user.save();

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Delete user profile (Protected)
// ===================================
const deleteUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await User.findByIdAndDelete(userId);
        if (!result) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Forgot password functionality (Public)
// ===================================
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User with that email not found' });
        }
        
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 3600000; // Token valid for 1 hour
        
        await user.save({ validateBeforeSave: false });
        
        const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        
        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset',
            html: `<p>You are receiving this because you have requested the reset of the password for your account.</p>
                   <p>Please click on the following link to complete the process:</p>
                   <a href="${resetURL}">${resetURL}</a>
                   <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
        };
        
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'There was an error sending the email. Try again later.' });
    }
};

// ===================================
// Reset password functionality (Public)
// ===================================
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ error: 'Token is invalid or has expired' });
        }
        
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        
        const newToken = createToken(user._id);

        res.status(200).json({ message: 'Password reset successfully', email: user.email, name: user.name, token: newToken });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ===================================
// Change password (Protected)
// ===================================
const changePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const match = await user.comparePassword(currentPassword);
        if (!match) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, deleteUserProfile, forgotPassword, resetPassword, changePassword };