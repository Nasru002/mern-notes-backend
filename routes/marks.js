const express = require('express');
const router = express.Router();
const InternalMark = require('../models/InternalMark');
const AcademicRecord = require('../models/AcademicRecord');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

// Helper to sync InternalMarks → AcademicRecord (MUST use find+save to trigger pre-save hook)
async function syncToAcademicRecord(studentId, subjectId) {
    try {
        const marks = await InternalMark.find({ student_id: studentId, subject_id: subjectId });

        let cia1 = 0, cia2 = 0, model = 0, assignment = 0, regularity = 0;
        marks.forEach(m => {
            const type = m.exam_type;
            if (type === 'CIA1') cia1 = m.marks_obtained;
            else if (type === 'CIA2') cia2 = m.marks_obtained;
            else if (type === 'Model Exam' || type === 'Model') model = m.marks_obtained;
            else if (type === 'Assignment') assignment = m.marks_obtained;
            else if (type === 'Regularity') regularity = m.marks_obtained;
        });

        const academicFromCIA = ((cia1 + cia2) / 100) * 6;
        const academicFromModel = (model / 75) * 6;
        const grandTotal = Math.min(Math.round(academicFromCIA + academicFromModel + assignment + regularity), 25);

        // IMPORTANT: Use find + save so the Mongoose pre-save hook recalculates eligibility_status
        let record = await AcademicRecord.findOne({ student_id: studentId, subject_id: subjectId });
        if (!record) {
            record = new AcademicRecord({ student_id: studentId, subject_id: subjectId });
        }

        // Only update internal_marks; preserve whatever attendance was already set
        record.internal_marks = grandTotal;
        await record.save(); // This triggers the pre-save hook → eligibility recalculated

        console.log(`✅ Synced marks: student=${studentId} subject=${subjectId} grandTotal=${grandTotal} status=${record.eligibility_status}`);
    } catch (err) {
        console.error('Sync to AcademicRecord Error:', err);
    }
}

// 1. Add / Update marks (Teacher) — auto-updates if mark already exists for that type
router.post('/add', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const { studentId, subjectId, assessmentType, obtainedMarks, maxMarks } = req.body;

        if (!studentId || !subjectId || !assessmentType || obtainedMarks === undefined) {
            return res.status(400).json({ success: false, error: 'studentId, subjectId, assessmentType, and obtainedMarks are all required.' });
        }

        const rounded = Math.round(Number(obtainedMarks));

        // Upsert: update existing record or create new one
        let mark = await InternalMark.findOne({ student_id: studentId, subject_id: subjectId, exam_type: assessmentType });

        if (mark) {
            // Update existing
            if (mark.isLocked) {
                return res.status(403).json({ success: false, error: 'Cannot update. Marks are locked.' });
            }
            mark.marks_obtained = rounded;
            mark.max_marks = maxMarks;
            await mark.save();
        } else {
            // Create new
            mark = new InternalMark({
                student_id: studentId,
                subject_id: subjectId,
                exam_type: assessmentType,
                marks_obtained: rounded,
                max_marks: maxMarks,
                enteredBy: req.session.userId || req.user?._id
            });
            await mark.save();
        }

        // Recalculate grand total and eligibility
        await syncToAcademicRecord(studentId, subjectId);

        res.status(200).json({ success: true, message: 'Marks saved and synced successfully.', data: mark });
    } catch (error) {
        console.error('Marks Add/Update Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to save marks' });
    }
});

// 2. Update marks
router.put('/update/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const { obtainedMarks, maxMarks, isLocked } = req.body;
        const mark = await InternalMark.findById(req.params.id);

        if (!mark) return res.status(404).json({ success: false, error: 'Mark record not found' });

        if (mark.isLocked) {
            // Cannot update if locked, unless explicitly unlocking (if admin/teacher is allowed. Let's say teacher cannot unlock once submitted, or maybe they can. We'll let them update if they pass isLocked: false or something, but usually locked means locked. We will just check if currently locked in DB.)
            return res.status(403).json({ success: false, error: 'Cannot update. Marks are locked.' });
        }

        if (obtainedMarks !== undefined) mark.marks_obtained = Math.round(obtainedMarks);
        if (maxMarks !== undefined) mark.max_marks = maxMarks;
        if (isLocked !== undefined) mark.isLocked = isLocked;

        await mark.save();
        await syncToAcademicRecord(mark.student_id, mark.subject_id);

        res.status(200).json({ success: true, message: 'Marks updated successfully', data: mark });
    } catch (error) {
        console.error('Marks Update Error:', error);
        res.status(500).json({ success: false, error: 'Failed to update marks' });
    }
});

// 3. Get marks for a student
router.get('/student/:studentId', requireAuth, async (req, res) => {
    try {
        let studentId = req.params.studentId;
        if (studentId === 'current' || studentId === 'me') {
            studentId = req.session.userId;
        }
        const marks = await InternalMark.find({ student_id: studentId }).populate('subject_id', 'name');
        res.status(200).json({ success: true, data: marks });
    } catch (error) {
        console.error('Get Marks Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch marks' });
    }
});

// 4. Get Marks Summary (Subject-wise total + overall)
router.get('/summary/:studentId', requireAuth, async (req, res) => {
    try {
        let studentId = req.params.studentId;
        if (studentId === 'current' || studentId === 'me') {
            studentId = req.session.userId;
        }
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Session missing student ID.' });
        }
        const internalMarks = await InternalMark.find({ student_id: studentId }).populate('subject_id', 'name');

        const subjectMap = {};

        internalMarks.forEach(mark => {
            const subId = mark.subject_id._id.toString();
            if (!subjectMap[subId]) {
                subjectMap[subId] = {
                    subjectId: subId,
                    subjectName: mark.subject_id.name,
                    cia1: 0,
                    cia2: 0,
                    model: 0,
                    assignment: 0,
                    regularity: 0
                };
            }

            const type = mark.exam_type;
            if (type === 'CIA1') subjectMap[subId].cia1 = mark.marks_obtained;
            else if (type === 'CIA2') subjectMap[subId].cia2 = mark.marks_obtained;
            else if (type === 'Model Exam' || type === 'Model') subjectMap[subId].model = mark.marks_obtained;
            else if (type === 'Assignment') subjectMap[subId].assignment = mark.marks_obtained;
            else if (type === 'Regularity') subjectMap[subId].regularity = mark.marks_obtained;
        });

        const subjectsSummary = Object.values(subjectMap).map(sub => {
            // Procedure from user:
            // 1. CIA 1 (50) + CIA 2 (50) mapped to 6 Marks
            const academicFromCIA = ((sub.cia1 + sub.cia2) / 100) * 6;

            // 2. Model Exam (75) mapped to 6 Marks
            const academicFromModel = (sub.model / 75) * 6;

            // 3. Total Academic (12)
            const academicTotal = Math.round(academicFromCIA + academicFromModel);

            // 4. Grand Total (25) = Academic(12) + Assignment(8) + Regularity(5)
            // User: "cia 1,2 and model ... marks will be provided max 12" -> Correct
            const grandTotal = Math.round(academicTotal + sub.assignment + sub.regularity);
            const percentage = Math.round((grandTotal / 25) * 100);

            return {
                ...sub,
                academicTotal: Math.min(academicTotal, 12),
                grandTotal: Math.min(grandTotal, 25),
                percentage
            };
        });

        let overallSum = 0;
        subjectsSummary.forEach(s => overallSum += s.percentage);
        const overallPercentage = subjectsSummary.length > 0 ? Math.round(overallSum / subjectsSummary.length) : 0;

        res.status(200).json({
            success: true,
            data: {
                subjects: subjectsSummary,
                overallPercentage
            }
        });
    } catch (error) {
        console.error('Marks Summary Error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate summary' });
    }
});

module.exports = router;
