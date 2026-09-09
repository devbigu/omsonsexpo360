import mongoose from "mongoose";
import winston from "winston";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bizcard'; // Fallback for local dev
    if (!mongoUri || mongoUri === 'mongodb://localhost:27017/bizcard') {
      if (process.env.NODE_ENV === 'production') {
        winston.error("Error: MONGO_URI environment variable is not defined in production.");
        throw new Error("MONGO_URI is required in production");
      }
      winston.warn("Using default MongoDB URI for local development");
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    winston.info("MongoDB Connected successfully");
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    winston.error(`MongoDB connection error: ${err.message}`);
    // In production, don't exit - let the server start and retry later
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw err; // Re-throw so caller can handle it
  }
};

export default connectDB;
