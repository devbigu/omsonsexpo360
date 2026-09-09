import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

// Configure multer disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// General file filter for common file types
const generalFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPEG, JPG, PNG, and WebP files are allowed'), false);
  }
};

// Strict file filter for PDF and JPEG only (for exhibition documents)
const strictFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and JPEG files are allowed'), false);
  }
};

// Image filter for business cards and similar
const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG, and WebP images are allowed'), false);
  }
};

// Card filter for business cards (images + audio)
const cardFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/m4a'
  ];
  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and audio files are allowed for business cards'), false);
  }
};

// File size limits based on type
const getFileSizeLimit = (file) => {
  if (file.mimetype === 'application/pdf') {
    return 10 * 1024 * 1024; // 10MB for PDFs
  } else if (file.mimetype.startsWith('image/')) {
    return 5 * 1024 * 1024; // 5MB for images
  }
  return 10 * 1024 * 1024; // Default 10MB
};

// General multer configuration
export const generalUpload = multer({
  storage,
  fileFilter: generalFileFilter,
  limits: {
    fileSize: getFileSizeLimit,
    files: 10
  }
});

// Strict multer configuration for exhibition documents
export const strictUpload = multer({
  storage,
  fileFilter: strictFileFilter,
  limits: {
    fileSize: getFileSizeLimit,
    files: 10
  }
});

// Image-only multer configuration
export const imageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: (file) => 5 * 1024 * 1024, // 5MB for images
    files: 5
  }
});

// Specialized configurations for different use cases
export const exhibitionUpload = multer({
  storage,
  fileFilter: strictFileFilter,
  limits: {
    fileSize: getFileSizeLimit,
    files: 10
  }
});

export const cardUpload = multer({
  storage,
  fileFilter: cardFilter,
  limits: {
    fileSize: (file) => 10 * 1024 * 1024, // 10MB limit for card data
    files: 6 // 5 images + 1 audio
  }
});

// Export the uploads directory path for use in other modules
export { uploadsDir };
