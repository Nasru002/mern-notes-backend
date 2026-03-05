const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
    console.log('🔍 Starting Database Connection Test...');
    console.log(`🔗 URI: ${process.env.MONGODB_URI ? 'FOUND (checking connection...)' : 'MISSING'}`);

    if (!process.env.MONGODB_URI) {
        console.error('❌ Error: MONGODB_URI is not defined in your .env file');
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // 5 second timeout for quick test
        });

        console.log('\n✅ SUCCESS: Connection Established!');
        console.log(`📡 Host: ${conn.connection.host}`);
        console.log(`📚 Database: ${conn.connection.name}`);

        await mongoose.connection.close();
        console.log('\n🛑 Test script finished successfully.');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ FAILED: Could not connect to MongoDB Atlas.');
        console.error(`🔴 Error Type: ${err.name}`);
        console.error(`🔴 Error Message: ${err.message}`);

        if (err.message.includes('ECONNRESET')) {
            console.log('\n💡 DIAGNOSIS: Network Connection Reset.');
            console.log('   This usually happens because:');
            console.log('   1. Your IP is NOT whitelisted in Atlas (Network Access tab).');
            console.log('   2. Your firewall/VPN is blocking port 27017.');
        }

        process.exit(1);
    }
};

testConnection();
