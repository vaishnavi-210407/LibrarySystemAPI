
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Librarycat",
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
    ISBN: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    publisher: {
        type: String,
        required: true,
        trim: true
    },
    language: {
        type: String,
        required: true,
        trim: true
    },
    publicationYear: {
        type: Number,
        required: true,
        min: 1,
        max: new Date().getFullYear()
    },
    image: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const bookModel = mongoose.model('books', bookSchema);

module.exports = bookModel;
