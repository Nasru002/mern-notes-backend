const mongoose = require('mongoose');
const InternalMark = require('./models/InternalMark');
const AcademicRecord = require('./models/AcademicRecord');

async function checkMarks() {
    try {
        await mongoose.connect('mongodb://localhost:27017/college-notes');
        console.log('--- InternalMark Records ---');
        const internalMarks = await InternalMark.find().limit(5);
        internalMarks.forEach(m => console.log(`ID: ${m._id}, Obtained: ${m.marks_obtained}, Max: ${m.max_marks}`));

        console.log('--- AcademicRecord Records ---');
        const academicRecords = await AcademicRecord.find().limit(5);
        academicRecords.forEach(r => console.log(`ID: ${r._id}, Roll: ${r.roll_number}, Marks: ${r.internal_marks}`));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkMarks();
