
const mongoose = require('mongoose');

const bookCopySchema = new mongoose.Schema({
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "books",
        required: true
    },
    copyNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["available", "unavailable"],
        default: "available",
        required: true
    }
}, { timestamps: true });

const bookCopyModel = mongoose.model('BookCopies', bookCopySchema);

module.exports = bookCopyModel;
