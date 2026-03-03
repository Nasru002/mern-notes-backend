const express = require('express');
const router = express.Router();
const studentProfileController = require('../controllers/studentProfileController');
const { requireAuth } = require('../middleware/auth'); // Fixed import

router.get('/profile/:id?', requireAuth, studentProfileController.getProfile);
router.get('/attendance-summary/:id?', requireAuth, studentProfileController.getAttendanceSummary);
router.get('/internal-summary/:id?', requireAuth, studentProfileController.getInternalSummary);
router.get('/placement-status/:id?', requireAuth, studentProfileController.getPlacementStatus);

module.exports = router;
