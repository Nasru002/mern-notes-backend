const express = require('express');
const router = express.Router();
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Subject = require('../models/Subject');
const { requireAuth, requireRole } = require('../middleware/auth');

// Debug middleware
router.use((req, res, next) => {
    console.log(`Academic Route: ${req.method} ${req.url}`);
    next();
});

// @route   POST /api/academic/update
// @desc    Update marks/attendance for a student in a subject
// @access  Teacher/Admin
router.post('/update', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { student_id, roll_number, subject_id, attendance_percentage, internal_marks, exam_eligible } = req.body;

        if ((!student_id && !roll_number) || !subject_id) {
            return res.status(400).json({ error: 'Student ID (or Roll Number) and Subject ID are required' });
        }

        let targetStudentId = student_id;

        // Lookup by Roll Number if provided and student_id is missing
        if (!targetStudentId && roll_number) {
            // Case insensitive lookup
            const student = await User.findOne({ roll_number: { $regex: new RegExp(`^${roll_number}$`, 'i') } });
            if (!student) {
                return res.status(404).json({ error: `Student with Roll Number '${roll_number}' not found` });
            }
            targetStudentId = student._id;
        }

        // Validate generic ranges
        if (attendance_percentage < 0 || attendance_percentage > 100) {
            return res.status(400).json({ error: 'Attendance must be between 0 and 100' });
        }
        if (internal_marks < 0 || internal_marks > 25) {
            return res.status(400).json({ error: 'Internal Marks must be between 0 and 25' });
        }

        // Find existing record or create new
        // We use findOne followed by save to ensure the pre-save hook runs
        let record = await AcademicRecord.findOne({
            student_id: targetStudentId,
            subject_id
        });

        if (!record) {
            record = new AcademicRecord({
                student_id: targetStudentId,
                subject_id
            });
        }

        // Update fields
        record.attendance_percentage = attendance_percentage;

        // Only overwrite internal_marks if the caller is deliberately setting it to a real value.
        // Sending 0 from the attendance-only update path should NOT zero out synced marks.
        if (internal_marks !== undefined && internal_marks > 0) {
            record.internal_marks = internal_marks;
        }
        // If internal_marks is 0 and record already has marks, preserve them.
        // (The marks sync in /marks/add will call save() and recalculate eligibility correctly.)

        if (exam_eligible !== undefined) record.exam_eligible = exam_eligible;
        record.last_updated_by = req.session.userId;

        // Save triggers eligibility calculation in pre-save hook
        await record.save();

        res.json({ success: true, record });
    } catch (error) {
        console.error('Update academic record error:', error);
        res.status(500).json({ error: 'Failed to update record' });
    }
});

// @route   GET /api/academic/student/my-status
// @desc    Get all academic records for the logged-in student
// @access  Student
router.get('/student/my-status', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const records = await AcademicRecord.find({ student_id: req.session.userId })
            .populate('subject_id', 'name semester')
            .sort({ 'updatedAt': -1 });

        res.json({ success: true, records });
    } catch (error) {
        console.error('Fetch student records error:', error);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

// @route   GET /api/academic/report?department=...&semester=...
// @desc    Get academic report (At Risk students etc)
// @access  Teacher/Admin
router.get('/report', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { department, semester, status } = req.query;

        let query = {};

        // 1. Find students matching filter
        if (department || semester) {
            const userQuery = { role: 'student' };
            // Department here might be ID or name. 
            // If it's a name (string), match User.department field (which is String).
            // If it's ID, we might need to look up. 
            // In User model, department is String. Good.
            if (department) userQuery.department = department;
            if (semester) userQuery.semester = semester;

            const students = await User.find(userQuery).select('_id');
            const studentIds = students.map(s => s._id);
            query.student_id = { $in: studentIds };
        }

        // 2. Filter by status if provided (e.g. 'NOT_ELIGIBLE')
        if (status) {
            query.eligibility_status = status;
        }

        const records = await AcademicRecord.find(query)
            .populate('student_id', 'full_name roll_number department semester')
            .populate('subject_id', 'name')
            .sort({ 'eligibility_status': 1 }); // Sort by status (Risk first usually)

        res.json({ success: true, records });
    } catch (error) {
        console.error('Fetch report error:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

// @route   GET /api/academic/students
// @desc    Get students in a department/semester (helper for dropdown)
// @access  Teacher/Admin
router.get('/students', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { department, semester } = req.query;
        let query = { role: 'student' };

        if (department) {
            // Check if it's an ID or Name
            if (department.match(/^[0-9a-fA-F]{24}$/)) {
                // If it's an ID, we need to find the Name first because User model stores Name
                const DeptModel = require('../models/Department');
                const deptDoc = await DeptModel.findById(department);
                if (deptDoc) {
                    query.department = deptDoc.name;
                }
            } else {
                query.department = department;
            }
        }

        if (semester) query.semester = semester;

        const students = await User.find(query)
            .select('roll_number full_name')
            .sort({ roll_number: 1 });

        res.json({ success: true, students });
    } catch (error) {
        console.error('Fetch students error:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// @route   GET /api/academic/subjects
// @desc    Get subjects (helper for teacher dropdown)
// @access  Teacher/Admin
router.get('/subjects', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const { department, semester } = req.query;
        let query = {};

        // Subject model links to Department via department_id (ObjectId)
        // User model stores department as Name (String)
        // We need to resolve Name to ID if a Name is provided

        if (department) {
            const Department = require('../models/Department');
            // Try to see if it's an ID
            if (department.match(/^[0-9a-fA-F]{24}$/)) {
                query.department_id = department;
            } else {
                // It's a name, find the ID
                const deptDoc = await Department.findOne({ name: department });
                if (deptDoc) {
                    query.department_id = deptDoc._id;
                } else {
                    // Department not found by name, return empty or try exact match?
                    // If searching by invalid department name, subject list should be empty.
                    return res.json({ success: true, subjects: [] });
                }
            }
        }
        if (semester) query.semester = semester;

        const subjects = await Subject.find(query);
        res.json({ success: true, subjects });
    } catch (error) {
        console.error('Fetch subjects error:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

module.exports = router;

// @route   DELETE /api/academic/records/:id
// @desc    Remove an academic record
// @access  Teacher/Admin
router.delete('/records/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const record = await AcademicRecord.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        await record.deleteOne();
        res.json({ success: true, message: 'Record removed successfully' });
    } catch (err) {
        console.error('Error removing record:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
