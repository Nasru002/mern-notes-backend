const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function fixAdmin() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('👤 Updating Admin user...');
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // We look for any user with username 'admin' OR roll_number 'ADMIN001'
        // and force it to be the correct admin.
        const admin = await User.findOneAndUpdate(
            { $or: [{ username: 'admin' }, { roll_number: 'ADMIN001' }] },
            {
                username: 'admin',
                roll_number: 'ADMIN001',
                password: hashedPassword,
                role: 'admin',
                full_name: 'System Administrator'
            },
            { upsert: true, new: true }
        );

        console.log('✅ Admin user fixed successfully!');
        console.log('   Register Number:', admin.roll_number);
        console.log('   Password: admin123');

    } catch (err) {
        console.error('❌ Error fixing admin:', err.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

fixAdmin();
