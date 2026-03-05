const mongoose = require('mongoose');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Attendance = require('./models/Attendance');
const InternalMark = require('./models/InternalMark');
const Leave = require('./models/Leave');
const Department = require('./models/Department');
const connectDB = require('./config/db');

require('dotenv').config();

const seedData = async () => {
    await connectDB();

    try {
        const students = await User.find({ role: 'student' });
        if (students.length === 0) {
            console.log("No students found. Please seed users first.");
            process.exit(1);
        }

        console.log(`🚀 Starting bulk seed for ${students.length} students...`);

        for (const student of students) {
            console.log(`--------------------------------------------------`);
            console.log(`📝 Seeding data for: ${student.full_name || student.username} (${student.roll_number})`);

            let departmentId = null;
            const dept = await Department.findOne({ name: student.department });
            if (dept) {
                departmentId = dept._id;
            } else {
                // Fallback: pick any department
                const randomDept = await Department.findOne();
                if (randomDept) departmentId = randomDept._id;
            }

            const subjects = await Subject.find({
                department_id: departmentId,
                semester: student.semester || 1
            });

            if (subjects.length === 0) {
                console.log(`⚠️ No subjects found for ${student.department} Sem ${student.semester}. Skipping.`);
                continue;
            }

            // 1. Seed Attendance
            await Attendance.deleteMany({ student_id: student._id });
            const attendanceRecords = [];
            // 30 days of records
            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);

                // Randomize attendance percentage per student (70% to 95%)
                const threshold = 0.7 + (Math.random() * 0.25);
                const status = Math.random() < threshold ? 'Present' : 'Absent';

                attendanceRecords.push({
                    student_id: student._id,
                    subject_id: subjects[i % subjects.length]._id,
                    date: date,
                    status: status
                });
            }
            await Attendance.insertMany(attendanceRecords);

            // 2. Seed Internal Marks
            await InternalMark.deleteMany({ student_id: student._id });
            const internalRecords = [];
            for (const sub of subjects) {
                // Randomize performance
                const baseMarks = 15 + Math.floor(Math.random() * 8); // 15-23

                internalRecords.push({
                    student_id: student._id,
                    subject_id: sub._id,
                    exam_type: 'Internal 1',
                    marks_obtained: Math.min(baseMarks + Math.floor(Math.random() * 3), 25),
                    max_marks: 25,
                    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                });
                internalRecords.push({
                    student_id: student._id,
                    subject_id: sub._id,
                    exam_type: 'Internal 2',
                    marks_obtained: Math.min(baseMarks - 2 + Math.floor(Math.random() * 4), 25),
                    max_marks: 25,
                    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
                });
            }
            await InternalMark.insertMany(internalRecords);

            // 3. Seed Leaves
            await Leave.deleteMany({ student_id: student._id });
            if (Math.random() > 0.5) {
                await Leave.create({
                    student_id: student._id,
                    start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                    end_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
                    reason: 'Personal reasons / Health',
                    status: 'Approved'
                });
            }
        }

        console.log(`==================================================`);
        console.log("✅ Bulk seeding finished successfully!");
    } catch (err) {
        console.error("❌ Seeding Error:", err);
    } finally {
        process.exit(0);
    }
};

seedData();
