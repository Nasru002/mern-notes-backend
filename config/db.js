const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of default
            heartbeatFrequencyMS: 2000,      // Check server status frequently
            socketTimeoutMS: 45000,          // Close sockets after 45 seconds of inactivity
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);

        return conn;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.error('\n⚠️  Make sure MongoDB is running!');
        console.error('   - If using local MongoDB: Start MongoDB service');
        console.error('   - If using MongoDB Atlas: Check your connection string in .env\n');
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});

module.exports = connectDB;
