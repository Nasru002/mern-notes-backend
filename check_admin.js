const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = await User.findOne({ roll_number: 'ADMIN001' });
        console.log("Admin user:", admin);

        // Also list all users briefly just in case
        const allUsers = await User.find({}).select('roll_number username role');
        console.log("All users:", allUsers);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkAdmin();
