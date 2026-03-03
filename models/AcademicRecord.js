const mongoose = require('mongoose');

const academicRecordSchema = new mongoose.Schema({
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
    attendance_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    internal_marks: {
        type: Number,
        default: 0,
        min: 0,
        max: 25
    },
    eligibility_status: {
        type: String,
        enum: ['ELIGIBLE', 'WARNING', 'NOT_ELIGIBLE'],
        default: 'NOT_ELIGIBLE'
    },
    exam_eligible: {
        type: Boolean,
        default: false
    },
    last_updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure one record per student per subject
academicRecordSchema.index({ student_id: 1, subject_id: 1 }, { unique: true });

// Pre-save hook to calculate eligibility
academicRecordSchema.pre('save', function (next) {
    if (this.isModified('attendance_percentage') || this.isModified('internal_marks')) {
        const attendance = this.attendance_percentage;
        const marks = this.internal_marks;

        // New Rules:
        // 1. Attendance < 65% OR Marks < 10 -> NOT_ELIGIBLE
        // 2. Attendance 65-75% (and marks >= 10) -> WARNING
        // 3. Attendance >= 75% AND Marks >= 10 -> ELIGIBLE

        if (marks < 10 || attendance < 65) {
            this.eligibility_status = 'NOT_ELIGIBLE';
        } else if (attendance < 75) {
            // This covers 65 <= attendance < 75
            this.eligibility_status = 'WARNING';
        } else {
            // This covers attendance >= 75 AND marks >= 10
            this.eligibility_status = 'ELIGIBLE';
        }
    }
    next();
});

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);
