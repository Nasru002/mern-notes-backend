const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Excused'],
        required: true
    },
    recorded_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for getting attendance of a specific student in a subject
attendanceSchema.index({ student_id: 1, subject_id: 1 });
attendanceSchema.index({ date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
