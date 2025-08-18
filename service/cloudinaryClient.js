/**
 * Cloudinary Client Configuration
 * Centralized v2 config from environment variables
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file to Cloudinary
 * @param {string} filePath - Path to the file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
async function uploadFile(filePath, options = {}) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      ...options
    });
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
async function uploadBuffer(buffer, options = {}) {
  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          ...options
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @returns {Promise<Object>} Delete result
 */
async function deleteFile(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get file information from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @returns {Promise<Object>} File information
 */
async function getFileInfo(publicId) {
  try {
    const result = await cloudinary.api.resource(publicId);
    
    return {
      success: true,
      info: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  cloudinary,
  uploadFile,
  uploadBuffer,
  deleteFile,
  getFileInfo
};



