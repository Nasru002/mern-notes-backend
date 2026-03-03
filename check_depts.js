const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
const Department = require('./models/Department');

async function checkDepts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const depts = await Department.find();
        console.log('--- Departments ---');
        depts.forEach(d => {
            console.log(`ID: ${d._id}, Name: ${d.name}`);
        });
        console.log('--------------------');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkDepts();
