import express from "express";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db.js";
import cardRoutes from "./routes/cardRoutes.js";
import exhibitionRoutes from "./routes/exhibitionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
// import multer from "multer";
// const { MulterError } = multer; // Removed to avoid potential destructuring issues

import multer, { MulterError } from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

const app = express();
app.use(compression());

// Trust proxy headers (Render/NGINX) so req.protocol/host reflect external URL
app.set("trust proxy", true);

// ---------------- Mongoose Connection ----------------
// Connect to database - handle errors gracefully
connectDB().catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  // Don't exit in production - let the server start and retry
  if (process.env.NODE_ENV === 'production') {
    console.error('Server will continue but database operations may fail');
  } else {
    process.exit(1);
  }
});

// ---------------- Middleware ----------------
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL || 'https://yourbusinesscardscanner.onrender.com';

const allowedOrigins = [
  "https://omsonsexpo360.com",
  "https://www.omsonsexpo360.com",
  "capacitor://localhost",
  "http://localhost"
];

if (isProduction) {
  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };

  app.use(cors(corsOptions));
  // app.options("*", cors(corsOptions));
  console.log("🔒 CORS: Restricted to allowed origins (production)");
} else {
  // Development: allow everything
  app.use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );
  // app.options("*",cors()); // respond to preflight
  console.log("🔓 CORS: Allowing all origins (development mode)");
}

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

// ---------------- Static File Serving ----------------
// Note: Since images are now stored as base64 in DB, this is no longer needed for images.
// Keeping for potential future use or other static files.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".m4a")) {
        res.set("Content-Type", "audio/mp4");
      } else if (filePath.endsWith(".mp3")) {
        res.set("Content-Type", "audio/mpeg");
      } else if (filePath.endsWith(".ogg")) {
        res.set("Content-Type", "audio/ogg");
      } else if (filePath.endsWith(".wav")) {
        res.set("Content-Type", "audio/wav");
      } else if (filePath.endsWith(".mp4")) {
        res.set("Content-Type", "video/mp4");
      }

      res.set("Content-Disposition", "inline");
      res.set("Accept-Ranges", "bytes"); // allows streaming
    },
  })
);

// ---------------- Routes ----------------
// Root route - health check
app.get("/", (req, res) => {
  res.json({
    message: "BizCard API Server",
    status: "running",
    version: "1.0.0",
    endpoints: {
      cards: "/api/cards",
      exhibitions: "/api/exhibitions",
      users: "/api/users",
      admin: "/api/admin",
    },
  });
});

// Health check endpoint for monitoring
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/cards", cardRoutes);
app.use("/api/exhibitions", exhibitionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// Multer error handling middleware
// Multer error handling middleware
app.use((error, req, res, next) => {
  // Use multer.MulterError directly to avoid ReferenceError if destructuring failed or created scope issues
  if (error instanceof MulterError) {
    console.error('Multer Error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB for PDFs and 5MB for images.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`
    });
  }

  if (error.message && error.message.includes('Only') && error.message.includes('allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

// Serve frontend build when available so refreshed routes resolve correctly
const frontendDistPath = path.join(__dirname, "..", "web", "dist");
if (fs.existsSync(frontendDistPath)) {
  console.log(`📦 Serving frontend from ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/") || req.method !== "GET") {
      return next();
    }

    return res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  console.warn("⚠️ Frontend dist folder not found. SPA routes will 404 on refresh until the frontend is built.");
}

// ---------------- Server ----------------
const PORT = process.env.PORT || 5000;

// Error handler for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB URI: ${process.env.MONGO_URI ? 'Set' : 'Not set'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
});
