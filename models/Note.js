const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    filename: {
        type: String,
        required: true
    },
    original_filename: {
        type: String,
        required: true
    },
    audio_filename: {
        type: String,
        default: null
    },
    audio_original_filename: {
        type: String,
        default: null
    },
    audio_duration: {
        type: Number,
        default: null
    },
    department_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    subject_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    uploaded_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    semester: {
        type: Number,
        default: null,
        min: 1,
        max: 6
    },
    download_count: {
        type: Number,
        default: 0
    },
    upload_date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for faster queries
noteSchema.index({ department_id: 1, semester: 1 });
noteSchema.index({ subject_id: 1 });
noteSchema.index({ uploaded_by: 1 });
noteSchema.index({ upload_date: -1 });
noteSchema.index({ title: 'text', description: 'text' }); // Text search

module.exports = mongoose.model('Note', noteSchema);
