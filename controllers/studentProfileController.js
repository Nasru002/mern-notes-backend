const User = require('../models/User');
const Attendance = require('../models/Attendance');
const InternalMark = require('../models/InternalMark');
const Leave = require('../models/Leave');
const Subject = require('../models/Subject');
const AcademicRecord = require('../models/AcademicRecord'); // Used to check arrears

// Helper to get target student ID (self if student, otherwise query param if provided)
const getTargetStudentId = (req) => {
    console.log('getTargetStudentId Session:', req.session.userId, req.session.role, req.params.id, req.query.id);
    if (req.session && req.session.role === 'student') {
        return req.session.userId;
    }
    return req.params.id || req.query.id || req.session.userId; // Admin/faculty can request specific student, fallback
};

exports.getProfile = async (req, res) => {
    try {
        const studentId = getTargetStudentId(req);
        if (!studentId) return res.status(400).json({ success: false, message: 'Student ID required.' });

        const student = await User.findById(studentId).select('-password');
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
        if (student.role !== 'student') return res.status(400).json({ success: false, message: 'User is not a student.' });

        const Department = require('../models/Department');
        const dept = await Department.findOne({ name: student.department });

        let enrolledSubjectsCount = 0;
        if (dept) {
            enrolledSubjectsCount = await Subject.countDocuments({
                department_id: dept._id,
                semester: student.semester || 1
            });
        }

        // Let's assume AcademicRecord captures enrolled subjects more accurately
        const actualEnrolledCount = await AcademicRecord.countDocuments({ student_id: studentId });

        const approvedLeaves = await Leave.countDocuments({ student_id: studentId, status: 'Approved' });

        res.status(200).json({
            success: true,
            data: {
                _id: student._id,
                name: student.full_name || student.username,
                registerNumber: student.roll_number,
                department: student.department,
                semester: student.semester,
                section: student.section || 'A', // Assuming section if missing
                subjectsEnrolled: actualEnrolledCount > 0 ? actualEnrolledCount : enrolledSubjectsCount,
                approvedLeaveCount: approvedLeaves
            }
        });
    } catch (error) {
        console.error('getProfile Error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving profile' });
    }
};

exports.getAttendanceSummary = async (req, res) => {
    try {
        const studentId = getTargetStudentId(req);
        if (!studentId) return res.status(400).json({ success: false, message: 'Student ID required.' });

        const attendanceRecords = await Attendance.find({ student_id: studentId }).populate('subject_id', 'name');

        let totalClasses = attendanceRecords.length;
        let presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
        let subjectsMap = {};

        // Build per-subject breakdown from detailed Attendance model
        attendanceRecords.forEach(r => {
            const subId = r.subject_id?._id?.toString() || 'unknown';
            const subName = r.subject_id?.name || 'Unknown Subject';
            if (!subjectsMap[subId]) {
                subjectsMap[subId] = { subjectId: subId, subjectName: subName, total: 0, present: 0 };
            }
            subjectsMap[subId].total++;
            if (r.status === 'Present') subjectsMap[subId].present++;
        });

        let percentage = 0;
        let subjectsBreakdown = [];

        if (totalClasses > 0) {
            percentage = (presentCount / totalClasses) * 100;
            subjectsBreakdown = Object.values(subjectsMap).map(s => ({
                subjectId: s.subjectId,
                subjectName: s.subjectName,
                total: s.total,
                present: s.present,
                absent: s.total - s.present,
                percentage: Math.round((s.present / s.total) * 100),
                status: (s.present / s.total) * 100 >= 75 ? 'Eligible' : (s.present / s.total) * 100 >= 65 ? 'Warning' : 'Defaulter'
            }));
        } else {
            // Fallback to AcademicRecord
            const academicRecords = await AcademicRecord.find({ student_id: studentId }).populate('subject_id', 'name');
            if (academicRecords.length > 0) {
                const totalPercent = academicRecords.reduce((sum, rec) => sum + rec.attendance_percentage, 0);
                percentage = totalPercent / academicRecords.length;

                subjectsBreakdown = academicRecords.map(rec => ({
                    subjectId: rec.subject_id?._id,
                    subjectName: rec.subject_id?.name || 'Unknown',
                    total: null,  // Not available from AcademicRecord
                    present: null,
                    absent: null,
                    percentage: Math.round(rec.attendance_percentage),
                    status: rec.attendance_percentage >= 75 ? 'Eligible' : rec.attendance_percentage >= 65 ? 'Warning' : 'Defaulter'
                }));
            }
        }

        percentage = Math.round(percentage);
        const status = percentage >= 75 ? 'Eligible' : 'Defaulter';

        res.status(200).json({
            success: true,
            data: {
                percentage,
                status,
                details: {
                    totalClasses,
                    presentCount,
                    absentCount: totalClasses - presentCount
                },
                subjectsBreakdown
            }
        });
    } catch (error) {
        console.error('getAttendanceSummary Error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving attendance summary' });
    }
};

exports.getInternalSummary = async (req, res) => {
    try {
        const studentId = getTargetStudentId(req);
        if (!studentId) return res.status(400).json({ success: false, message: 'Student ID required.' });

        const internalMarks = await InternalMark.find({ student_id: studentId }).populate('subject_id', 'name');

        let totalAverage = 0;
        let subjectsBreakdown = [];

        if (internalMarks.length > 0) {
            // Group by subject to calculate average per subject
            const subjectMap = {};
            internalMarks.forEach(mark => {
                const subId = mark.subject_id._id.toString();
                if (!subjectMap[subId]) {
                    subjectMap[subId] = { subjectName: mark.subject_id.name, totalObtained: 0, totalMax: 0 };
                }
                subjectMap[subId].totalObtained += mark.marks_obtained;
                subjectMap[subId].totalMax += mark.max_marks;
            });

            let ovrObtained = 0;
            let ovrMax = 0;

            subjectsBreakdown = Object.keys(subjectMap).map(subId => {
                const data = subjectMap[subId];
                const subPercentage = (data.totalObtained / data.totalMax) * 100;
                ovrObtained += data.totalObtained;
                ovrMax += data.totalMax;

                return {
                    subjectId: subId,
                    subjectName: data.subjectName,
                    percentage: parseFloat(subPercentage.toFixed(2)),
                    status: subPercentage >= 50 ? 'Pass' : 'Improvement Required'
                };
            });

            if (ovrMax > 0) {
                totalAverage = (ovrObtained / ovrMax) * 100;
            }

        } else {
            // Fallback to AcademicRecord if detailed internal marks aren't available
            const academicRecords = await AcademicRecord.find({ student_id: studentId }).populate('subject_id', 'name');
            if (academicRecords.length > 0) {
                const totalMarks = academicRecords.reduce((sum, rec) => sum + rec.internal_marks, 0);
                const count = academicRecords.length;
                // Assuming max mark is 25 based on AcademicRecord schema
                totalAverage = (totalMarks / (count * 25)) * 100;

                subjectsBreakdown = academicRecords.map(rec => {
                    const perc = (rec.internal_marks / 25) * 100;
                    return {
                        subjectId: rec.subject_id._id,
                        subjectName: rec.subject_id.name,
                        percentage: parseFloat(perc.toFixed(2)),
                        status: perc >= 50 ? 'Pass' : 'Improvement Required',
                        rawMark: rec.internal_marks
                    };
                });
            }
        }

        totalAverage = parseFloat(totalAverage.toFixed(2));
        const status = totalAverage >= 50 ? 'Pass' : 'Improvement Required';

        res.status(200).json({
            success: true,
            data: {
                totalAverage,
                status,
                subjectsBreakdown
            }
        });

    } catch (error) {
        console.error('getInternalSummary Error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving internal summary' });
    }
};

exports.getPlacementStatus = async (req, res) => {
    try {
        const studentId = getTargetStudentId(req);
        if (!studentId) return res.status(400).json({ success: false, message: 'Student ID required.' });

        // Calculate Attendance
        const attendanceRecords = await Attendance.find({ student_id: studentId });
        let attPercentage = 0;
        if (attendanceRecords.length > 0) {
            const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
            attPercentage = (presentCount / attendanceRecords.length) * 100;
        } else {
            const acRecords = await AcademicRecord.find({ student_id: studentId });
            if (acRecords.length > 0) {
                const totalPercent = acRecords.reduce((sum, rec) => sum + rec.attendance_percentage, 0);
                attPercentage = totalPercent / acRecords.length;
            }
        }

        // Calculate Internal Average
        const internalMarks = await InternalMark.find({ student_id: studentId });
        let intAverage = 0;
        if (internalMarks.length > 0) {
            let ovrObtained = 0;
            let ovrMax = 0;
            internalMarks.forEach(mark => {
                ovrObtained += mark.marks_obtained;
                ovrMax += mark.max_marks;
            });
            if (ovrMax > 0) intAverage = (ovrObtained / ovrMax) * 100;
        } else {
            const acRecords = await AcademicRecord.find({ student_id: studentId });
            if (acRecords.length > 0) {
                const totalMarks = acRecords.reduce((sum, rec) => sum + rec.internal_marks, 0);
                intAverage = (totalMarks / (acRecords.length * 25)) * 100;
            }
        }

        // Check active arrears 
        // We'll define an active arrear as any subject where internal average is < 50
        let activeArrearsCount = 0;
        const acRecords = await AcademicRecord.find({ student_id: studentId });
        if (internalMarks.length === 0 && acRecords.length > 0) {
            activeArrearsCount = acRecords.filter(rec => (rec.internal_marks / 25) * 100 < 50).length;
        } else if (internalMarks.length > 0) {
            const subjectTotals = {};
            internalMarks.forEach(mark => {
                const subId = mark.subject_id.toString();
                if (!subjectTotals[subId]) subjectTotals[subId] = { ob: 0, mx: 0 };
                subjectTotals[subId].ob += mark.marks_obtained;
                subjectTotals[subId].mx += mark.max_marks;
            });
            Object.values(subjectTotals).forEach(st => {
                if ((st.ob / st.mx) * 100 < 50) activeArrearsCount++;
            });
        }

        // Apply rules: config by admin (we'll hardcode here based on requirements, attendance >= 75%, int average >= 60, no arrears)
        const isEligible = attPercentage >= 75 && intAverage >= 60 && activeArrearsCount === 0;

        res.status(200).json({
            success: true,
            data: {
                status: isEligible ? 'Eligible' : 'Not Eligible',
                metrics: {
                    attendancePercentage: parseFloat(attPercentage.toFixed(2)),
                    internalAverage: parseFloat(intAverage.toFixed(2)),
                    activeArrears: activeArrearsCount
                },
                rulesApplied: {
                    requiredAttendance: 75,
                    requiredInternalAverage: 60,
                    maxArrearsAllowed: 0
                }
            }
        });

    } catch (error) {
        console.error('getPlacementStatus Error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving placement status' });
    }
};
