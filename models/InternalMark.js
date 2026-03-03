const mongoose = require('mongoose');

const internalMarkSchema = new mongoose.Schema({
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
    exam_type: {
        type: String, // e.g., 'Internal 1', 'Internal 2', 'Model Exam', 'Assignment'
        required: true
    },
    marks_obtained: {
        type: Number,
        required: true,
        min: 0
    },
    max_marks: {
        type: Number,
        required: true,
        min: 1
    },
    enteredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isLocked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

internalMarkSchema.index({ student_id: 1, subject_id: 1, exam_type: 1 }, { unique: true });

module.exports = mongoose.model('InternalMark', internalMarkSchema);
