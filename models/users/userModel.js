const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    roleId: {
        type: mongoose.Schema.ObjectId,
        ref: "roles",
        required: true
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
        required: true
    }
}, {timestamps: true});

const userModel = mongoose.model('LibraryUsers', userSchema);

module.exports = userModel;