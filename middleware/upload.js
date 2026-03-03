const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const audioUploadsDir = path.join(__dirname, '..', 'uploads', 'audio');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(audioUploadsDir)) fs.mkdirSync(audioUploadsDir, { recursive: true });

// Multer storage configuration (same as original)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Store audio files in separate directory
        if (file.fieldname === 'audio') {
            cb(null, audioUploadsDir);
        } else {
            cb(null, uploadsDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (same validation as original)
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'file') {
        // PDF validation for notes
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed for notes'));
        }
    } else if (file.fieldname === 'audio') {
        // Audio validation - includes WebM for voice recorder
        const allowedAudioTypes = [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/x-wav',
            'audio/mp4',
            'audio/x-m4a',
            'audio/ogg',
            'audio/webm',
            'audio/webm;codecs=opus'
        ];
        if (allowedAudioTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only MP3, WAV, M4A, OGG, and WebM audio files are allowed'));
        }
    } else {
        cb(null, true);
    }
};

// Multer upload configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    }
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large. Maximum size is 25MB' });
        }
        return res.status(400).json({ error: 'File upload error: ' + err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
};

module.exports = {
    upload,
    handleUploadError,
    uploadsDir,
    audioUploadsDir
};
