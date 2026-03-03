const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const NoteDownload = require('../models/NoteDownload');
const NoteView = require('../models/NoteView');

// Registration route (disabled by default, same as original)
router.post('/register', async (req, res) => {
    // Registration disabled by admin
    res.status(403).json({ error: 'Registration is disabled. Please contact administrator.' });
});

// Login route - EXACT SAME LOGIC as original project
router.post('/login', async (req, res) => {
    const { roll_number, password } = req.body;

    if (!roll_number || !password) {
        return res.status(400).json({ error: 'Register Number and password required' });
    }

    try {
        // Find user by roll_number (primary identifier now)
        const user = await User.findOne({ roll_number: roll_number });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password with bcrypt (same as original)
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is blocked (same as original)
        if (user.is_blocked) {
            return res.status(403).json({ error: 'Your account has been blocked. Please contact admin.' });
        }

        // Always treat special "admin" username as admin (same as original)
        if (user.username === 'admin' && user.role !== 'admin') {
            user.role = 'admin';
            await user.save();
        }

        // Create session (same as original)
        req.session.userId = user._id.toString();
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.department = user.department;
        req.session.semester = user.semester;

        // Return user data (same as original)
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'Login successful',
            user: userResponse
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    }
});

// Logout route (same as original)
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user (same as original)
router.get('/user', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Get user stats
router.get('/user/stats', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const userId = req.session.userId;

        const [downloadsCount, viewsCount] = await Promise.all([
            NoteDownload.countDocuments({ user_id: userId }),
            NoteView.countDocuments({ user_id: userId })
        ]);

        res.json({
            downloads: downloadsCount,
            views: viewsCount
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get recent downloads
router.get('/user/history/downloads', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const history = await NoteDownload.find({ user_id: req.session.userId })
            .sort({ downloaded_at: -1 })
            .limit(10)
            .populate('note_id');

        res.json(history);
    } catch (error) {
        console.error('Get download history error:', error);
        res.status(500).json({ error: 'Failed to fetch download history' });
    }
});

// Get recent views
router.get('/user/history/views', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const history = await NoteView.find({ user_id: req.session.userId })
            .sort({ viewed_at: -1 })
            .limit(10)
            .populate('note_id');

        res.json(history);
    } catch (error) {
        console.error('Get view history error:', error);
        res.status(500).json({ error: 'Failed to fetch view history' });
    }
});

// Update user profile
router.put('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { password, department, semester } = req.body;
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update password if provided
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        // Update department if provided
        if (department) {
            user.department = department;
            req.session.department = department; // Update session
        }

        // Update semester if provided
        if (semester) {
            user.semester = parseInt(semester);
            req.session.semester = user.semester; // Update session
        }

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
