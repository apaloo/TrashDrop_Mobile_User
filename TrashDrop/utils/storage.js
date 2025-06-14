/**
 * Firebase Storage Utility
 * 
 * Provides a simple interface for uploading, downloading, and managing files in Firebase Storage.
 */

const admin = require('firebase-admin');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');
const { isProduction } = require('./env');
const { badRequest, internalError } = require('../middleware/errorHandler');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    logger.info('Firebase Storage initialized');
  } catch (error) {
    logger.error('Firebase Storage initialization error', { error });
    throw error;
  }
}

const bucket = admin.storage().bucket();

/**
 * Uploads a file to Firebase Storage
 * @param {Object} file - Processed file object (from processFileUpload)
 * @param {string} [folder='uploads'] - Folder to upload the file to
 * @returns {Promise<Object>} Uploaded file metadata
 */
async function uploadFile(file, folder = 'uploads') {
  try {
    const filePath = `${folder}/${file.fileName}`;
    const fileRef = bucket.file(filePath);
    
    // Set metadata
    const metadata = {
      contentType: file.mimeType,
      metadata: {
        originalName: file.originalName,
        uploadedAt: new Date().toISOString(),
      },
    };

    // Upload the file
    await fileRef.save(file.buffer, {
      metadata,
      public: true,
      validation: 'md5',
    });

    // Make the file publicly accessible in production
    if (isProduction()) {
      await fileRef.makePublic();
    }

    // Get the public URL
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-09-2025', // 1 year from now
    });

    // Return file metadata
    const [metadataResult] = await fileRef.getMetadata();
    
    return {
      name: fileRef.name,
      url,
      contentType: metadataResult.contentType,
      size: Number(metadataResult.size),
      timeCreated: metadataResult.timeCreated,
      updated: metadataResult.updated,
      metadata: metadataResult.metadata,
    };
  } catch (error) {
    logger.error('File upload failed', { error: error.message, stack: error.stack });
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Deletes a file from Firebase Storage
 * @param {string} filePath - Path to the file in the bucket
 * @returns {Promise<boolean>} True if deletion was successful
 */
async function deleteFile(filePath) {
  try {
    const fileRef = bucket.file(filePath);
    const [exists] = await fileRef.exists();
    
    if (!exists) {
      logger.warn('File not found for deletion', { filePath });
      return false;
    }
    
    await fileRef.delete();
    logger.info('File deleted successfully', { filePath });
    return true;
  } catch (error) {
    logger.error('File deletion failed', { filePath, error: error.message });
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Gets a signed URL for a file
 * @param {string} filePath - Path to the file in the bucket
 * @param {number} [expiresIn=3600] - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Signed URL
 */
async function getSignedUrl(filePath, expiresIn = 3600) {
  try {
    const fileRef = bucket.file(filePath);
    const [exists] = await fileRef.exists();
    
    if (!exists) {
      throw new Error('File not found');
    }
    
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    
    return url;
  } catch (error) {
    logger.error('Failed to generate signed URL', { filePath, error: error.message });
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

/**
 * Lists all files in a folder
 * @param {string} [folderPath=''] - Folder path to list files from
 * @param {boolean} [recursive=true] - Whether to list files recursively
 * @returns {Promise<Array>} Array of file metadata objects
 */
async function listFiles(folderPath = '', recursive = true) {
  try {
    const [files] = await bucket.getFiles({
      prefix: folderPath ? `${folderPath}/` : '',
      autoPaginate: true,
    });

    // Filter out directories and process file metadata
    const fileList = await Promise.all(
      files
        .filter(file => !file.name.endsWith('/')) // Exclude directories
        .map(async (file) => {
          const [metadata] = await file.getMetadata();
          return {
            name: file.name,
            url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
            contentType: metadata.contentType,
            size: Number(metadata.size),
            timeCreated: metadata.timeCreated,
            updated: metadata.updated,
            metadata: metadata.metadata,
          };
        })
    );

    return fileList;
  } catch (error) {
    logger.error('Failed to list files', { folderPath, error: error.message });
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Gets file metadata
 * @param {string} filePath - Path to the file in the bucket
 * @returns {Promise<Object>} File metadata
 */
async function getFileMetadata(filePath) {
  try {
    const fileRef = bucket.file(filePath);
    const [exists] = await fileRef.exists();
    
    if (!exists) {
      throw new Error('File not found');
    }
    
    const [metadata] = await fileRef.getMetadata();
    
    return {
      name: fileRef.name,
      url: `https://storage.googleapis.com/${bucket.name}/${filePath}`,
      contentType: metadata.contentType,
      size: Number(metadata.size),
      timeCreated: metadata.timeCreated,
      updated: metadata.updated,
      metadata: metadata.metadata,
    };
  } catch (error) {
    logger.error('Failed to get file metadata', { filePath, error: error.message });
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
}

/**

/**
 * Validates and processes a file upload
 * @param {Object} file - Multer file object
 * @param {Array} allowedMimeTypes - Allowed MIME types
 * @param {number} maxFileSize - Maximum file size in bytes
 * @returns {Object} Processed file info
 * @throws {Error} If validation fails
 */
function processFileUpload(file, allowedMimeTypes = [], maxFileSize = 5 * 1024 * 1024) {
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size
  if (file.size > maxFileSize) {
    throw new Error(`File size exceeds the maximum limit of ${maxFileSize / (1024 * 1024)}MB`);
  }

  // Check MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }

  // Generate a unique filename
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const fileName = `${uuidv4()}${fileExtension}`;
  const filePath = `uploads/${fileName}`;

  return {
    originalName: file.originalname,
    fileName,
    filePath,
    mimeType: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  };
}

// Export all utility functions
module.exports = {
  bucket,
  uploadFile,
  deleteFile,
  getSignedUrl,
  listFiles,
  getFileMetadata,
  processFileUpload
};
