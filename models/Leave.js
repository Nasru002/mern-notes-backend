const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

leaveSchema.index({ student_id: 1, status: 1 });

module.exports = mongoose.model('Leave', leaveSchema);
