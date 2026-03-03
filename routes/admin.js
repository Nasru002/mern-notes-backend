const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Note = require('../models/Note');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Announcement = require('../models/Announcement');
const { requireAuth, requireRole } = require('../middleware/auth');

// Middleware to ensure admin access
const requireAdmin = [requireAuth, requireRole('admin')];

// Get System Stats
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const [users, notes, departments, subjects, students, teachers, blockedUsers] = await Promise.all([
            User.countDocuments(),
            Note.countDocuments(),
            Department.countDocuments(),
            Subject.countDocuments(),
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'teacher' }),
            User.countDocuments({ is_blocked: true })
        ]);

        res.json({
            users,
            notes,
            departments,
            subjects,
            students,
            teachers,
            blockedUsers
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get All Users
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ created_at: -1 });
        res.json(users);
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Delete User
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent deleting the last admin or yourself (optional safety)
        if (user._id.toString() === req.session.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Delete Note (Admin Override)
router.delete('/notes/:id', requireAdmin, async (req, res) => {
    try {
        const note = await Note.findByIdAndDelete(req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        // Ideally we should also delete the file from FS here, 
        // but for now database removal is the priority.
        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Delete Announcement
router.delete('/announcements/:id', requireAdmin, async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndDelete(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// Create New User (Admin)
router.post('/users', requireAdmin, async (req, res) => {
    try {
        const { username, email, password, role, department, semester, full_name, phone, roll_number, admission_year, attendance_percentage } = req.body;

        // Validation
        if (!roll_number || !password || !role) {
            return res.status(400).json({ error: 'Please provide Register Number, Password and Role' });
        }

        // Check availability
        const existingUser = await User.findOne({
            $or: [{ roll_number }]
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Register Number already exists' });
        }

        // Also check username/email if provided
        if (username || email) {
            const extraCheck = await User.findOne({
                $or: [
                    ...(username ? [{ username }] : []),
                    ...(email ? [{ email }] : [])
                ]
            });
            if (extraCheck) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username: username || undefined,
            email: email || undefined,
            password: hashedPassword,
            role,
            department: (role === 'student' || role === 'teacher') ? department : null,
            semester: role === 'student' ? semester : null,
            full_name,
            phone,
            roll_number,
            admission_year: role === 'student' ? admission_year : null,
            attendance_percentage: role === 'student' ? attendance_percentage : 0
        });

        await newUser.save();

        res.json({ success: true, message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update User (Admin)
router.put('/users/:id', requireAdmin, async (req, res) => {
    try {
        const { username, email, role, department, semester, full_name, phone, roll_number, admission_year, attendance_percentage } = req.body;
        const userId = req.params.id;

        // Validation
        if (!roll_number || !role) {
            return res.status(400).json({ error: 'Please provide Register Number and Role' });
        }

        // Check if roll_number exists for OTHER users
        const existingUser = await User.findOne({
            roll_number,
            _id: { $ne: userId }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Register Number already exists' });
        }

        // Also check username/email if provided
        if (username || email) {
            const extraCheck = await User.findOne({
                $or: [
                    ...(username ? [{ username }] : []),
                    ...(email ? [{ email }] : [])
                ],
                _id: { $ne: userId }
            });
            if (extraCheck) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }
        }

        const updateData = {
            roll_number,
            username: username || undefined,
            email: email || undefined,
            role,
            department: (role === 'student' || role === 'teacher') ? department : null,
            semester: role === 'student' ? semester : null,
            full_name,
            phone,
            admission_year: role === 'student' ? admission_year : null,
            attendance_percentage: role === 'student' ? attendance_percentage : 0
        };

        // If username or email is cleared, we should explicitly set them to undefined 
        // for Mongoose to handle them correctly (or null if we want to clear them).
        // Actually, with sparse indexes, undefined is better for mongo, but findByIdAndUpdate 
        // won't $unset them if they are undefined.
        // Let's use null if they are empty to clear them.
        if (!username) updateData.username = null;
        if (!email) updateData.email = null;

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Toggle User Block Status
router.put('/users/:id/block', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user._id.toString() === req.session.userId) {
            return res.status(400).json({ error: 'Cannot block your own account' });
        }

        user.is_blocked = !user.is_blocked;
        await user.save();

        res.json({
            success: true,
            message: `User ${user.is_blocked ? 'blocked' : 'unblocked'} successfully`,
            is_blocked: user.is_blocked
        });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

module.exports = router;
