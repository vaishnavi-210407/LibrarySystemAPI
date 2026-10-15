const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
    borrowingId: {
        type: mongoose.Schema.ObjectId,
        ref: "borrowing",
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ["paid", "unpaid"],
        default: "unpaid",
        required: true
    },
    paidAt: {
        type: Date,
        required: false
    }
}, {timestamps: true});

const fineModel = mongoose.model('fines', fineSchema);

module.exports = fineModel;