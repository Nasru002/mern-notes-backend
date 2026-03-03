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
        const student = await User.findOne({ role: 'student' });
        if (!student) {
            console.log("No student found. Please seed users first.");
            process.exit(1);
        }

        console.log(`Seeding data for student: ${student.username} (${student._id})`);

        let departmentId = student.department;
        if (typeof student.department === 'string') {
            const tempDept = await mongoose.model('Department').findOne({ name: student.department });
            if (tempDept) departmentId = tempDept._id;
        }

        const subjects = await Subject.find({ department_id: departmentId }).limit(3);
        if (subjects.length === 0) {
            console.log("No subjects found.");
            process.exit(1);
        }

        // 1. Seed Attendance
        await Attendance.deleteMany({ student_id: student._id });
        const attendanceRecords = [];
        for (let i = 0; i < 20; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            // 85% attendance
            const status = Math.random() < 0.85 ? 'Present' : 'Absent';

            attendanceRecords.push({
                student_id: student._id,
                subject_id: subjects[i % subjects.length]._id,
                date: date,
                status: status
            });
        }
        await Attendance.insertMany(attendanceRecords);
        console.log("✅ Attendance seeded");

        // 2. Seed Internal Marks
        await InternalMark.deleteMany({ student_id: student._id });
        const internalRecords = [];
        for (const sub of subjects) {
            internalRecords.push({
                student_id: student._id,
                subject_id: sub._id,
                exam_type: 'Internal 1',
                marks_obtained: Math.floor(Math.random() * 10) + 15, // 15-25 marks
                max_marks: 25
            });
            internalRecords.push({
                student_id: student._id,
                subject_id: sub._id,
                exam_type: 'Internal 2',
                marks_obtained: Math.floor(Math.random() * 10) + 10, // 10-20 marks
                max_marks: 25
            });
        }
        await InternalMark.insertMany(internalRecords);
        console.log("✅ Internal Marks seeded");

        // 3. Seed Leaves
        await Leave.deleteMany({ student_id: student._id });
        await Leave.create({
            student_id: student._id,
            start_date: new Date(),
            end_date: new Date(),
            reason: 'Sick leave',
            status: 'Approved'
        });
        console.log("✅ Leaves seeded");

        console.log("All seeding finished successfully!");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
};

seedData();
