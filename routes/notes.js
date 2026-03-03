const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Note = require('../models/Note');
const Department = require('../models/Department');
const User = require('../models/User');
const Notification = require('../models/Notification');
const NoteDownload = require('../models/NoteDownload');
const NoteView = require('../models/NoteView');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload, handleUploadError, uploadsDir, audioUploadsDir } = require('../middleware/upload');

// Upload note (teachers only)
router.post('/upload', requireAuth, requireRole('teacher'), upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]), handleUploadError, async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file uploaded. Please select a PDF file.' });
        }

        const pdfFile = req.files.file[0];
        const audioFile = req.files.audio ? req.files.audio[0] : null;
        const { title, description, department_id, subject_id, semester, audio_duration } = req.body;

        if (!title || !department_id || !subject_id) {
            // Delete uploaded files if validation fails
            if (pdfFile && pdfFile.path) fs.unlinkSync(pdfFile.path);
            if (audioFile && audioFile.path) fs.unlinkSync(audioFile.path);
            return res.status(400).json({ error: 'Title, department, and subject are required' });
        }

        // Create note document
        const note = new Note({
            title,
            description: description || '',
            filename: pdfFile.filename,
            original_filename: pdfFile.originalname,
            audio_filename: audioFile ? audioFile.filename : null,
            audio_original_filename: audioFile ? audioFile.originalname : null,
            audio_duration: audio_duration ? parseInt(audio_duration) : null,
            department_id,
            subject_id,
            uploaded_by: req.session.userId,
            semester: semester ? parseInt(semester) : null
        });

        await note.save();

        // Get department name for notifications
        const dept = await Department.findById(department_id);
        if (dept) {
            // Create notification for students in the department
            const notificationMessage = audioFile
                ? `New notes with audio explanation uploaded: ${title}`
                : `New notes uploaded: ${title}`;

            const students = await User.find({ role: 'student', department: dept.name });

            const notifications = students.map(student => ({
                user_id: student._id,
                message: notificationMessage,
                type: 'info'
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        }

        res.json({
            success: true,
            message: 'Note uploaded successfully',
            note: { id: note._id, title: note.title }
        });
    } catch (error) {
        console.error('Upload note error:', error);
        // Clean up files on error
        if (req.files) {
            if (req.files.file && req.files.file[0].path) fs.unlinkSync(req.files.file[0].path);
            if (req.files.audio && req.files.audio[0].path) fs.unlinkSync(req.files.audio[0].path);
        }
        res.status(500).json({ error: 'Failed to save note' });
    }
});

// Get notes (with filters)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { department_id, subject_id, semester, search } = req.query;
        let query = {};

        const hasExplicitDepartmentFilter = Boolean(department_id);

        // Filter by user's department if student (unless they explicitly selected a department)
        if (req.session.role === 'student' && req.session.department && !hasExplicitDepartmentFilter) {
            const dept = await Department.findOne({ name: req.session.department });
            if (dept) {
                query.department_id = dept._id;
            }
        }

        // Filter by user's semester if student
        if (req.session.role === 'student' && req.session.semester && !semester) {
            query.semester = req.session.semester;
        }

        if (department_id) {
            query.department_id = department_id;
        }

        if (subject_id) {
            query.subject_id = subject_id;
        }

        if (semester) {
            query.semester = parseInt(semester);
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const notes = await Note.find(query)
            .populate('department_id', 'name')
            .populate('subject_id', 'name')
            .populate('uploaded_by', 'username')
            .sort({ upload_date: -1 });

        // Format response to match original API
        const formattedNotes = notes.map(note => ({
            id: note._id,
            title: note.title,
            description: note.description,
            filename: note.filename,
            original_filename: note.original_filename,
            audio_filename: note.audio_filename,
            audio_original_filename: note.audio_original_filename,
            audio_duration: note.audio_duration,
            department_id: note.department_id._id,
            department_name: note.department_id.name,
            subject_id: note.subject_id._id,
            subject_name: note.subject_id.name,
            uploaded_by: note.uploaded_by._id,
            uploaded_by_name: note.uploaded_by.username,
            semester: note.semester,
            download_count: note.download_count,
            upload_date: note.upload_date
        }));

        res.json(formattedNotes);
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Get single note by ID
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id)
            .populate('department_id', 'name')
            .populate('subject_id', 'name')
            .populate('uploaded_by', 'username');

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json({
            id: note._id,
            title: note.title,
            description: note.description,
            filename: note.filename,
            original_filename: note.original_filename,
            audio_filename: note.audio_filename,
            audio_original_filename: note.audio_original_filename,
            audio_duration: note.audio_duration,
            department_id: note.department_id._id,
            department_name: note.department_id.name,
            subject_id: note.subject_id._id,
            subject_name: note.subject_id.name,
            uploaded_by: note.uploaded_by._id,
            uploaded_by_name: note.uploaded_by.username,
            semester: note.semester,
            download_count: note.download_count,
            upload_date: note.upload_date
        });
    } catch (error) {
        console.error('Get note error:', error);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

// Preview note (PDF)
router.get('/:id/preview', requireAuth, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const filePath = path.join(uploadsDir, note.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        // Record view
        const noteView = new NoteView({
            user_id: req.session.userId,
            note_id: req.params.id
        });
        await noteView.save();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${note.original_filename}"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Preview note error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to load preview' });
        }
    }
});

// Download note
router.get('/:id/download', requireAuth, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const filePath = path.join(uploadsDir, note.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        // Increment download count
        note.download_count += 1;
        await note.save();

        // Record download
        const noteDownload = new NoteDownload({
            user_id: req.session.userId,
            note_id: req.params.id
        });
        await noteDownload.save();

        res.download(filePath, note.original_filename);
    } catch (error) {
        console.error('Download note error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download file' });
        }
    }
});

// Stream audio
router.get('/:id/audio', requireAuth, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        if (!note.audio_filename) {
            return res.status(404).json({ error: 'No audio file available for this note' });
        }

        const audioPath = path.join(audioUploadsDir, note.audio_filename);
        if (!fs.existsSync(audioPath)) {
            return res.status(404).json({ error: 'Audio file not found on server' });
        }

        // Determine MIME type
        const ext = path.extname(note.audio_filename).toLowerCase();
        const mimeTypes = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.ogg': 'audio/ogg',
            '.webm': 'audio/webm'
        };
        const contentType = mimeTypes[ext] || 'audio/mpeg';

        // Set headers for audio streaming
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${note.audio_original_filename}"`);
        res.setHeader('Accept-Ranges', 'bytes');

        // Stream the audio file with range support
        const stat = fs.statSync(audioPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(audioPath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': chunksize
            });
            file.pipe(res);
        } else {
            res.writeHead(200, { 'Content-Length': fileSize });
            fs.createReadStream(audioPath).pipe(res);
        }
    } catch (error) {
        console.error('Stream audio error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream audio' });
        }
    }
});

// Delete a note (Teacher owns it or Admin)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Check ownership or admin role
        if (note.uploaded_by.toString() !== req.session.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete this note' });
        }

        // Ideally delete file from filesystem here too
        // const fs = require('fs');
        // const path = require('path');
        // if (note.file_path) fs.unlink(path.join(__dirname, '..', note.file_path), (err) => {});

        await Note.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

module.exports = router;
