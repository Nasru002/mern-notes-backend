// Script to create admin user in MongoDB
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Department = require('./models/Department');

async function setup() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Create default departments
        console.log('📚 Creating default departments...');
        const departments = ['Computer Science', 'Computer Application'];

        for (const deptName of departments) {
            const existing = await Department.findOne({ name: deptName });
            if (!existing) {
                await Department.create({ name: deptName });
                console.log(`   ✅ Created department: ${deptName}`);
            } else {
                console.log(`   ⏭️  Department already exists: ${deptName}`);
            }
        }

        // Create admin user
        console.log('\n👤 Creating admin user...');
        const existingAdmin = await User.findOne({
            $or: [{ username: 'admin' }, { roll_number: 'ADMIN001' }]
        });

        if (existingAdmin) {
            console.log('   ⏭️  Admin user already exists');
            console.log('   Username: admin');
            console.log('   (Password unchanged)');
        } else {
            const hashedPassword = await bcrypt.hash('admin123', 10);

            const admin = new User({
                username: 'admin',
                email: 'admin@college.edu',
                password: hashedPassword,
                role: 'admin',
                full_name: 'System Administrator',
                roll_number: 'ADMIN001'
            });

            await admin.save();
            console.log('   ✅ Admin user created successfully!');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('   Email: admin@college.edu');
        }

        // Create sample teacher
        console.log('\n👨‍🏫 Creating sample teacher...');
        const existingTeacher = await User.findOne({
            $or: [{ username: 'teacher' }, { roll_number: 'TEACHER001' }]
        });

        if (existingTeacher) {
            console.log('   ⏭️  Teacher user already exists');
        } else {
            const hashedPassword = await bcrypt.hash('teacher123', 10);

            const teacher = new User({
                username: 'teacher',
                email: 'teacher@college.edu',
                password: hashedPassword,
                role: 'teacher',
                department: 'Computer Science',
                full_name: 'Sample Teacher',
                roll_number: 'TEACHER001'
            });

            await teacher.save();
            console.log('   ✅ Teacher user created!');
            console.log('   Username: teacher');
            console.log('   Password: teacher123');
        }

        // Create sample student
        console.log('\n👨‍🎓 Creating sample student...');
        const existingStudent = await User.findOne({ username: 'student' });

        if (existingStudent) {
            console.log('   ⏭️  Student user already exists');
        } else {
            const hashedPassword = await bcrypt.hash('student123', 10);

            const student = new User({
                username: 'student',
                email: 'student@college.edu',
                password: hashedPassword,
                role: 'student',
                department: 'Computer Science',
                semester: 3,
                full_name: 'Sample Student',
                roll_number: 'CS2023001'
            });

            await student.save();
            console.log('   ✅ Student user created!');
            console.log('   Username: student');
            console.log('   Password: student123');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Setup completed successfully!');
        console.log('='.repeat(60));
        console.log('\n📝 Login Credentials:');
        console.log('   Admin    - register number: ADMIN001  password: admin123');
        console.log('   Teacher  - register number: TEACHER001  password: teacher123');
        console.log('   Student  - register number: CS2023001  password: student123');
        console.log('\n🚀 You can now start the application!');
        console.log('   1. Run: npm start (in backend folder)');
        console.log('   2. Run: npm start (in frontend folder)');
        console.log('   3. Open: http://localhost:3000\n');

    } catch (error) {
        console.error('\n❌ Error during setup:', error.message);
        console.error('\nPlease check:');
        console.error('   1. MongoDB is running');
        console.error('   2. Connection string in .env is correct');
        console.error('   3. You have internet connection (if using MongoDB Atlas)\n');
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed\n');
        process.exit(0);
    }
}

setup();
