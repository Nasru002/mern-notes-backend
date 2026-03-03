const mongoose = require('mongoose');

const noteViewSchema = new mongoose.Schema({
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
    viewed_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
noteViewSchema.index({ user_id: 1, viewed_at: -1 });
noteViewSchema.index({ note_id: 1 });

module.exports = mongoose.model('NoteView', noteViewSchema);
