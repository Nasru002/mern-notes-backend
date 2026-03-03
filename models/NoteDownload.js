const mongoose = require('mongoose');

const noteDownloadSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    note_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Note',
        required: true
    },
    downloaded_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
noteDownloadSchema.index({ user_id: 1, downloaded_at: -1 });
noteDownloadSchema.index({ note_id: 1 });

module.exports = mongoose.model('NoteDownload', noteDownloadSchema);
