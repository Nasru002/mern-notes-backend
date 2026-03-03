const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true
});

// Index for faster queries
departmentSchema.index({ name: 1 });

module.exports = mongoose.model('Department', departmentSchema);
