const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { requireAuth, requireRole } = require('../middleware/auth');

// Create a new announcement (Teacher/Admin only)
// Create a new announcement (Teacher or Admin)
router.post('/', requireAuth, async (req, res) => {
    // Check permissions
    if (req.session.role !== 'teacher' && req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    try {
        const { title, message, type, audience } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const announcement = new Announcement({
            title,
            message,
            type: type || 'info',
            audience: audience || 'all',
            created_by: req.session.userId
        });

        await announcement.save();

        res.json({
            success: true,
            message: 'Announcement posted successfully',
            announcement
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

// Get all announcements
router.get('/', requireAuth, async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('created_by', 'username role')
            .sort({ created_at: -1 })
            .limit(20);

        res.json(announcements);
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

module.exports = router;
