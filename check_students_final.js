const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
const User = require('./models/User');

async function checkStudents() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const students = await User.find({ role: 'student' }).select('roll_number department semester full_name');
        console.log('--- Student List ---');
        students.forEach(s => {
            console.log(`Roll: ${s.roll_number}, Dept: ${s.department}, Sem: ${s.semester}, Name: ${s.full_name}`);
        });
        console.log('--------------------');
        console.log(`Total Students: ${students.length}`);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkStudents();
