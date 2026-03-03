const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    department_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    }
}, {
    timestamps: true
});

// Index for faster queries
subjectSchema.index({ department_id: 1, semester: 1 });
subjectSchema.index({ name: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
