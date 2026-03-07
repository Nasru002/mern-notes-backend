const Leave = require('../models/Leave');
const User = require('../models/User');

/**
 * @desc    Apply for a new leave
 * @route   POST /api/leaves/apply
 * @access  Private (Student)
 */
exports.applyLeave = async (req, res) => {
    try {
        const { start_date, end_date, reason } = req.body;
        const student_id = req.session.userId || req.user?._id;

        if (!student_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
        }

        if (!start_date || !end_date || !reason) {
            return res.status(400).json({ success: false, message: 'Start date, end date, and reason are required.' });
        }

        const newLeave = new Leave({
            student_id,
            start_date,
            end_date,
            reason,
            status: 'Pending'
        });

        await newLeave.save();

        res.status(201).json({
            success: true,
            message: 'Leave application submitted successfully.',
            data: newLeave
        });
    } catch (error) {
        console.error('applyLeave Error:', error);
        res.status(500).json({ success: false, message: 'Server error while applying for leave.' });
    }
};

/**
 * @desc    Get leave history for the logged-in student
 * @route   GET /api/leaves/my-history
 * @access  Private (Student)
 */
exports.getStudentHistory = async (req, res) => {
    try {
        const student_id = req.session.userId || req.user?._id;

        if (!student_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        const leaves = await Leave.find({ student_id }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        console.error('getStudentHistory Error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving leave history.' });
    }
};

/**
 * @desc    Get all leave requests for admin/teacher review
 * @route   GET /api/leaves/all
 * @access  Private (Admin/Teacher)
 */
exports.getAllRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};

        const requests = await Leave.find(query)
            .populate('student_id', 'full_name username roll_number department semester')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error('getAllRequests Error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving leave requests.' });
    }
};

/**
 * @desc    Review a leave request (Approve/Reject)
 * @route   PUT /api/leaves/review/:id
 * @access  Private (Admin/Teacher)
 */
exports.reviewLeave = async (req, res) => {
    try {
        const { status, teacherRemarks } = req.body;
        const leaveId = req.params.id;
        const admin_id = req.session.userId || req.user?._id;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected.' });
        }

        const leave = await Leave.findById(leaveId);

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave request not found.' });
        }

        leave.status = status;
        leave.approved_by = admin_id;
        leave.teacherRemarks = teacherRemarks || '';

        await leave.save();

        res.status(200).json({
            success: true,
            message: `Leave request ${status.toLowerCase()} successfully.`,
            data: leave
        });
    } catch (error) {
        console.error('reviewLeave Error:', error);
        res.status(500).json({ success: false, message: 'Server error while reviewing leave request.' });
    }
};
