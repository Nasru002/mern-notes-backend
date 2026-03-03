const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false,
        unique: true,
        trim: true,
        sparse: true
    },
    email: {
        type: String,
        required: false,
        unique: true,
        lowercase: true,
        trim: true,
        sparse: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['teacher', 'student', 'admin'],
        default: 'student'
    },
    department: {
        type: String,
        default: null
    },
    semester: {
        type: Number,
        default: null,
        min: 1,
        max: 6
    },
    full_name: {
        type: String,
        default: null
    },
    roll_number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    phone: {
        type: String,
        default: null
    },
    admission_year: {
        type: Number,
        default: null
    },
    attendance_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    is_blocked: {
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
userSchema.index({ roll_number: 1 });
userSchema.index({ username: 1 }, { sparse: true });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model('User', userSchema);
