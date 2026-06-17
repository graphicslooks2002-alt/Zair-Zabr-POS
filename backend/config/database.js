const mongoose = require("mongoose");
const config = require("./config");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.databaseURI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(`⚠️  Real MongoDB not available, trying in-memory server...`);
        try {
            const { MongoMemoryServer } = require("mongodb-memory-server");
            const mongoServer = await MongoMemoryServer.create();
            const uri = mongoServer.getUri();
            const conn = await mongoose.connect(uri);
            console.log(`✅ In-Memory MongoDB Connected (test mode): ${conn.connection.host}`);
        } catch (memError) {
            console.log(`❌ Database connection failed: ${memError.message}`);
            process.exit();
        }
    }
}

module.exports = connectDB;