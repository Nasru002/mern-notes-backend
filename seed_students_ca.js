const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();
const User = require('./models/User');

async function seedStudentsCA() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('student123', salt);

        const students = [];
        const baseRoll = 2313181033000;

        console.log('Generating students from ...001 to ...050 for CA Sem 1');

        for (let i = 1; i <= 50; i++) {
            const roll = (baseRoll + i).toString();

            // For CA students, we might want to update existing ones if they were CS
            const existing = await User.findOne({ roll_number: roll });
            if (existing) {
                console.log(`Roll ${roll} exists, updating to CA Sem 1.`);
                existing.department = 'Computer Application';
                existing.semester = 1;
                await existing.save();
                continue;
            }

            students.push({
                username: `user_${roll}`,
                email: `student_${roll}@example.com`,
                roll_number: roll,
                password: password,
                role: 'student',
                full_name: `Student ${roll}`,
                department: 'Computer Application',
                semester: 1,
                admission_year: 2023,
                attendance_percentage: 0
            });
        }

        if (students.length > 0) {
            await User.insertMany(students);
            console.log(`Successfully seeded ${students.length} new students.`);
        } else {
            console.log('All students were updated.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seedStudentsCA();
