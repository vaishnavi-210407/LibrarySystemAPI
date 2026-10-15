
const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LibraryUsers',
        required: true
    },
    copyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BookCopies',
        required: true
    },
    librarianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LibraryUsers',
        default: null
    },
    issueDate: {
        type: Date,
        default: null
    },
    dueDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date,
        default: null
    },
    returnStatus: {
        type: String,
        enum: ['returned', 'notReturned'],
        default: 'notReturned',
        required: true
    },
    requestStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        required: true
    }
}, {
    timestamps: true
});

const borrowModel = mongoose.model('borrowing', borrowSchema);

module.exports = borrowModel;
