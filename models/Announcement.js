const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['info', 'important', 'urgent', 'general']
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    target_role: {
        type: String,
        default: 'all',
        enum: ['all', 'teacher', 'student']
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
announcementSchema.index({ created_at: -1 });
announcementSchema.index({ target_role: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
