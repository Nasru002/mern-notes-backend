const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get all departments
router.get('/departments', async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.json(departments);
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Get subjects (with optional filters)
router.get('/subjects', async (req, res) => {
    try {
        const { department_id, semester } = req.query;
        let query = {};

        if (department_id) {
            query.department_id = department_id;
        }

        if (semester) {
            query.semester = parseInt(semester);
        }

        const subjects = await Subject.find(query)
            .populate('department_id', 'name')
            .sort({ name: 1 });

        // Format response to match original API
        const formattedSubjects = subjects.map(subject => ({
            id: subject._id,
            name: subject.name,
            department_id: subject.department_id._id,
            department_name: subject.department_id.name,
            semester: subject.semester
        }));

        res.json(formattedSubjects);
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

// Add new subject (teachers only)
router.post('/subjects', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const { name, department_id, semester } = req.body;

        if (!name || !department_id || !semester) {
            return res.status(400).json({ error: 'Name, department_id, and semester are required' });
        }

        const subject = new Subject({
            name,
            department_id,
            semester: parseInt(semester)
        });

        await subject.save();

        res.json({ success: true, id: subject._id });
    } catch (error) {
        console.error('Create subject error:', error);
        res.status(500).json({ error: 'Failed to create subject' });
    }
});

module.exports = router;
