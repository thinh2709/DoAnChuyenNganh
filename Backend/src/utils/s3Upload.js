/**
 * Utility upload file lên AWS S3
 * Thay thế việc lưu file local bằng S3
 */

const AWS = require("aws-sdk");
const config = require("../config/env");
const logger = require("./logger");

// Cấu hình AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "ap-southeast-1", // Singapore region
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || "techzy-restaurant-images";

/**
 * Upload file lên S3
 * @param {Buffer} fileBuffer - Buffer của file
 * @param {string} fileName - Tên file
 * @param {string} mimetype - MIME type của file
 * @returns {Promise<string>} URL của file trên S3
 */
const uploadToS3 = async (fileBuffer, fileName, mimetype) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: `images/${fileName}`, // Lưu trong thư mục images
      Body: fileBuffer,
      ContentType: mimetype,
    };

    const result = await s3.upload(params).promise();
    logger.info("Upload file lên S3 thành công", {
      fileName,
      location: result.Location,
    });

    // Trả về URL của file
    return result.Location;
  } catch (error) {
    logger.error("Lỗi upload file lên S3", {
      error: error.message,
      fileName,
    });
    throw error;
  }
};

/**
 * Xóa file khỏi S3
 * @param {string} fileUrl - URL của file cần xóa
 * @returns {Promise<boolean>}
 */
const deleteFromS3 = async (fileUrl) => {
  try {
    // Extract key từ URL
    // URL format: https://bucket-name.s3.region.amazonaws.com/images/filename
    const urlParts = fileUrl.split("/");
    const key = urlParts.slice(urlParts.indexOf("images")).join("/");

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    logger.info("Xóa file khỏi S3 thành công", { key });
    return true;
  } catch (error) {
    logger.error("Lỗi xóa file khỏi S3", {
      error: error.message,
      fileUrl,
    });
    return false;
  }
};

/**
 * Lấy URL public của file từ key
 * @param {string} key - S3 key của file
 * @returns {string} Public URL
 */
const getPublicUrl = (key) => {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-southeast-1"}.amazonaws.com/${key}`;
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getPublicUrl,
  BUCKET_NAME,
};

