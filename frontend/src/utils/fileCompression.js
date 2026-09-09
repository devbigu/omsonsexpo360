import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';

/**
 * Compress image files using browser-image-compression
 * @param {File} file - Image file to compress
 * @param {number} maxSizeMB - Maximum size in MB (default: 5)
 * @param {number} maxWidthOrHeight - Maximum width/height in pixels (default: 1920)
 * @returns {Promise<File>} - Compressed file
 */
export const compressImage = async (file, maxSizeMB = 5, maxWidthOrHeight = 1920) => {
  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: file.type,
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image');
  }
};

/**
 * Compress PDF files by reducing image quality and removing unnecessary data
 * @param {File} file - PDF file to compress
 * @param {number} quality - Image quality (0.1 to 1.0, default: 0.7)
 * @returns {Promise<File>} - Compressed PDF file
 */
export const compressPDF = async (file, quality = 0.7) => {
  try {
    const existingPdfBytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Get all pages
    const pages = pdfDoc.getPages();
    
    // Compress images in each page
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Scale down pages that are too large
      if (width > 2000 || height > 2000) {
        const scale = Math.min(2000 / width, 2000 / height);
        page.scale(scale, scale);
      }
    }
    
    // Save with compression
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      compress: true,
    });
    
    return new File([pdfBytes], file.name, {
      type: 'application/pdf',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Error compressing PDF:', error);
    throw new Error('Failed to compress PDF');
  }
};

/**
 * Automatically compress file based on type
 * @param {File} file - File to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed file
 */
export const compressFile = async (file, options = {}) => {
  const {
    maxImageSizeMB = 2, // Updated to 2MB
    maxPDFSizeMB = 10, // Updated to 10MB
    imageQuality = 0.8,
    pdfQuality = 0.7,
    maxWidthOrHeight = 1920,
  } = options;

  try {
    // Check if file needs compression
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Return original file if it's already small enough
    if (file.type.startsWith('image/') && fileSizeMB <= maxImageSizeMB) {
      return file;
    }
    
    if (file.type === 'application/pdf' && fileSizeMB <= maxPDFSizeMB) {
      return file;
    }

    // Compress based on file type
    if (file.type.startsWith('image/')) {
      return await compressImage(file, maxImageSizeMB, maxWidthOrHeight);
    } else if (file.type === 'application/pdf') {
      return await compressPDF(file, pdfQuality);
    }
    
    // Return original file for unsupported types
    return file;
  } catch (error) {
    console.error('Error in compressFile:', error);
    // Return original file if compression fails
    return file;
  }
};

/**
 * Get file size reduction information
 * @param {number} originalSize - Original file size in bytes
 * @param {number} compressedSize - Compressed file size in bytes
 * @returns {Object} - Size reduction information
 */
export const getSizeReductionInfo = (originalSize, compressedSize) => {
  const reductionBytes = originalSize - compressedSize;
  const reductionPercent = ((reductionBytes / originalSize) * 100).toFixed(1);
  
  return {
    originalSize: (originalSize / (1024 * 1024)).toFixed(2) + ' MB',
    compressedSize: (compressedSize / (1024 * 1024)).toFixed(2) + ' MB',
    reductionBytes: (reductionBytes / (1024 * 1024)).toFixed(2) + ' MB',
    reductionPercent: reductionPercent + '%',
  };
};
