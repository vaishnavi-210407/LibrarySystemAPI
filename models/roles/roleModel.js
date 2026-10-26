const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        enum: ["admin", "librarian", "member"],
        required: true,
        unique: true
    },
    description : {
        type: String,
        required: true
    }
}, {timestamps: true});

const roleModel = mongoose.model('roles', roleSchema);

module.exports = roleModel; 