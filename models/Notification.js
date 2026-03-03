const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        default: 'info',
        enum: ['info', 'success', 'warning', 'error']
    },
    read: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
notificationSchema.index({ user_id: 1, read: 1 });
notificationSchema.index({ created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
