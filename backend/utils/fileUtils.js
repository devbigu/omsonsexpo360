import fs from 'fs';
import path from 'path';
import { uploadsDir } from '../config/multer.js';

/**
 * Delete a file from the uploads directory
 * @param {string} filename - The filename to delete
 * @returns {boolean} - True if file was deleted, false if it didn't exist
 */
export const deleteFile = (filename) => {
  if (!filename) return false;
  
  const filePath = path.join(uploadsDir, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filename}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error);
    return false;
  }
};

/**
 * Delete multiple files from the uploads directory
 * @param {string[]} filenames - Array of filenames to delete
 * @returns {number} - Number of files successfully deleted
 */
export const deleteFiles = (filenames) => {
  if (!Array.isArray(filenames)) return 0;
  
  let deletedCount = 0;
  filenames.forEach(filename => {
    if (deleteFile(filename)) {
      deletedCount++;
    }
  });
  return deletedCount;
};

/**
 * Get file information (size, existence)
 * @param {string} filename - The filename to check
 * @returns {Object|null} - File info or null if file doesn't exist
 */
export const getFileInfo = (filename) => {
  if (!filename) return null;
  
  const filePath = path.join(uploadsDir, filename);
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        exists: true,
        path: filePath
      };
    }
    return null;
  } catch (error) {
    console.error(`Error getting file info for ${filename}:`, error);
    return null;
  }
};

/**
 * Clean up old files from uploads directory (older than specified days)
 * @param {number} daysOld - Delete files older than this many days
 * @returns {number} - Number of files deleted
 */
export const cleanupOldFiles = (daysOld = 30) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime.getTime() < cutoffTime) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`Cleaned up old file: ${file}`);
      }
    });

    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    return 0;
  }
};

/**
 * Get total size of uploads directory
 * @returns {number} - Total size in bytes
 */
export const getUploadsSize = () => {
  try {
    const files = fs.readdirSync(uploadsDir);
    let totalSize = 0;

    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });

    return totalSize;
  } catch (error) {
    console.error('Error calculating uploads size:', error);
    return 0;
  }
};
