const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/LeaveController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Apply for leave (Student only)
router.post('/apply', requireAuth, requireRole('student'), leaveController.applyLeave);

// Get my leave history (Student only)
router.get('/my-history', requireAuth, requireRole('student'), leaveController.getStudentHistory);

// Get all leave requests (Admin/Faculty/Teacher)
router.get('/all', requireAuth, requireRole('admin', 'faculty', 'teacher'), leaveController.getAllRequests);

// Review leave (Admin/Faculty/Teacher)
router.put('/review/:id', requireAuth, requireRole('admin', 'faculty', 'teacher'), leaveController.reviewLeave);

module.exports = router;
