// D:\Vreuse\backend\models\User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the schema for the User model
const userSchema = new mongoose.Schema({
    // User's email address
    email: {
        type: String,
        required: true,
        unique: true, // Ensures no two users can have the same email
        trim: true,
        // Custom validation to ensure the email is a valid VIT address
        match: [/.+@vit\.(ac|edu)\.in$/, 'Please use a valid VIT email address']
    },
    // User's hashed password
    password: {
        type: String,
        required: true,
        minlength: 6 // Enforce a minimum password length
    },
    // The user's full name
    name: {
        type: String,
        required: true
    },
    // The user's role, either Student or Teacher
    role: {
        type: String,
        required: true,
        enum: ['Student', 'Teacher'] // Restrict role to these two values
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// === Mongoose Middleware ===
// This hook runs before a user document is saved to the database.
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (e.g., during creation or a password change)
    if (!this.isModified('password')) {
        return next();
    }
    // Generate a salt to add security to the hashing process
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// === Custom Schema Method ===
// This method is added to every user document and is used to compare a login password with the hashed password in the database.
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Create the User model from the schema
const User = mongoose.model('User', userSchema);

module.exports = User;