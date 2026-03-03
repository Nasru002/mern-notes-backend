const mongoose = require('mongoose');
const InternalMark = require('./models/InternalMark');
const AcademicRecord = require('./models/AcademicRecord');

async function scaleMarks() {
    try {
        await mongoose.connect('mongodb://localhost:27017/college-notes');
        console.log('Connected to MongoDB');

        // 1. Scale InternalMark records
        const internalResult = await InternalMark.updateMany(
            { max_marks: 50 },
            [
                {
                    $set: {
                        marks_obtained: { $divide: ["$marks_obtained", 2] },
                        max_marks: 25
                    }
                }
            ]
        );
        console.log(`Updated ${internalResult.modifiedCount} InternalMark records (scaled 50 -> 25)`);

        // 2. Scale AcademicRecord records (if any were entered out of 50 by mistake)
        // Note: AcademicRecord typically stores a single 'internal_marks' field.
        // If the user says "internal marks are 50", maybe they entered values up to 50 in this 0-25 field.
        const academicResult = await AcademicRecord.updateMany(
            { internal_marks: { $gt: 25 } },
            [
                {
                    $set: {
                        internal_marks: { $round: [{ $divide: ["$internal_marks", 2] }, 0] }
                    }
                }
            ]
        );
        console.log(`Updated ${academicResult.modifiedCount} AcademicRecord records (assuming values > 25 were meant to be out of 50)`);

        await mongoose.disconnect();
        console.log('Scaling complete.');
    } catch (err) {
        console.error('Scaling error:', err);
    }
}

scaleMarks();
