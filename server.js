const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust Render's reverse proxy so req.secure works correctly
if (isProduction) {
    app.set('trust proxy', 1);
}

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins
        callback(null, true);
    },
    credentials: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration (SAME as original project)
app.use(session({
    secret: process.env.SESSION_SECRET || 'mern-college-notes-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
        secure: isProduction,        // true on Render (HTTPS), false locally
        sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin cookies on HTTPS
        maxAge: 24 * 60 * 60 * 1000  // 24 hours
    }
}));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Import routes
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const notesRoutes = require('./routes/notes');
const announcementRoutes = require('./routes/announcements');
const adminRoutes = require('./routes/admin');
const academicRoutes = require('./routes/academic');
const studentProfileRoutes = require('./routes/studentProfileRoutes');
const marksRoutes = require('./routes/marks');
const Note = require('./models/Note');
const Subject = require('./models/Subject');
const User = require('./models/User');
const { requireAuth, requireRole } = require('./middleware/auth');

app.use('/api', authRoutes);
app.use('/api', departmentRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/student', studentProfileRoutes);
app.use('/api/marks', marksRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'MERN Notes API is running',
        timestamp: new Date().toISOString()
    });
});

// Catch-all for undefined routes
app.use((req, res) => {
    console.error(`[404 NOT FOUND] ${req.method} ${req.url}`);
    res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 MERN College Notes Sharing - Backend Server');
    console.log('='.repeat(60));
    console.log(`✅ Server running on: http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log('='.repeat(60) + '\n');
    console.log('📝 Available API Endpoints:');
    console.log('   POST   /api/login');
    console.log('   POST   /api/logout');
    console.log('   GET    /api/user');
    console.log('   GET    /api/departments');
    console.log('   GET    /api/subjects');
    console.log('   POST   /api/subjects');
    console.log('   POST   /api/notes/upload');
    console.log('   GET    /api/notes');
    console.log('   GET    /api/notes/:id');
    console.log('   GET    /api/notes/:id/preview');
    console.log('   GET    /api/notes/:id/download');
    console.log('   GET    /api/notes/:id/audio');
    console.log('   GET    /api/health');
    console.log('='.repeat(60) + '\n');
});

// Initialize default departments
const Department = require('./models/Department');

const initializeDefaultData = async () => {
    try {
        const allowedDepartments = ['Computer Science', 'Computer Application'];
        const departmentDocs = {};

        for (const deptName of allowedDepartments) {
            const dept = await Department.findOneAndUpdate(
                { name: deptName },
                { name: deptName },
                { upsert: true, new: true }
            );
            departmentDocs[deptName] = dept;
        }

        console.log('✅ Default departments initialized');

        // Seed Default Subjects
        const defaultSubjects = {
            'Computer Science': {
                1: ['Programming in C', 'Computer Fundamentals', 'Mathematics-I', 'Digital Logic'],
                2: ['Data Structures', 'Object Oriented Programming', 'Mathematics-II', 'Environmental Science'],
                3: ['Database Management Systems', 'Java Programming', 'Computer Networks', 'Operating Systems'],
                4: ['Python Programming', 'Software Engineering', 'Discrete Mathematics', 'Web Technologies'],
                5: ['Artificial Intelligence', 'Data Mining', 'Network Security', 'Cloud Computing'],
                6: ['Machine Learning', 'Internet of Things', 'Mobile Application Development', 'Major Project']
            },
            'Computer Application': {
                1: ['C Programming', 'IT Tools & Business Systems', 'PC Software', 'Financial Accounting'],
                2: ['C++ & Object Oriented Programming', 'DBMS', 'Analysis of Algorithms', 'Business Communication'],
                3: ['Java Programming', 'Internet & Web Design', 'Visual Basic', 'Multimedia Systems'],
                4: ['E-Commerce', 'Management Information Systems', 'Computer Graphics', 'Software Engineering'],
                5: ['Advanced Web Development', 'Network Security', 'Mobile Computing', 'Software Testing'],
                6: ['Linux & Shell Programming', 'PHP Programming', 'System Analysis & Design', 'Project Work']
            }
        };

        for (const deptName of allowedDepartments) {
            const subjectsBySem = defaultSubjects[deptName];
            const deptId = departmentDocs[deptName]._id;

            for (const sem in subjectsBySem) {
                for (const subName of subjectsBySem[sem]) {
                    await Subject.findOneAndUpdate(
                        { name: subName, department_id: deptId, semester: Number(sem) },
                        { name: subName, department_id: deptId, semester: Number(sem) },
                        { upsert: true }
                    );
                }
            }
        }
        console.log('✅ Default subjects initialized');

    } catch (error) {
        console.error('❌ Error initializing default data:', error);
    }
};

// Call initialization after a short delay to ensure DB connection
setTimeout(initializeDefaultData, 2000);

module.exports = app;
