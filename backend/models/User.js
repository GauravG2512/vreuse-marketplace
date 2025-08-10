// D:\Vreuse\backend\models\User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the schema for the User model
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/.+@vit\.(ac|edu)\.in$/, 'Please use a valid VIT email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['Student', 'Teacher']
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;