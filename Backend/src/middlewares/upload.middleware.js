
const multer = require("multer");
const path = require("path");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
require("dotenv").config(); // Load biến môi trường ngay lập tức

// ✅ Kiểm tra biến môi trường AWS
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
  console.error("❌ LỖI: Thiếu cấu hình AWS S3 trong .env");
}

// ✅ Cấu hình AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ✅ Cấu hình Multer Storage với S3
const storage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  // ⚠️ QUAN TRỌNG: Đã xóa phần metadata lưu tên gốc để tránh lỗi Signature với tiếng Việt
  metadata: (req, file, cb) => {
    cb(null, { fieldName: "image_upload" }); // Chỉ lưu metadata đơn giản không dấu
  },
  key: (req, file, cb) => {
    // Tạo tên file mới: uploads/timestamp-random.ext
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const fileName = `uploads/image-${uniqueSuffix}${ext}`;
    cb(null, fileName);
  },
});

console.log("✅ Upload middleware configured with AWS S3");

// ✅ File filter (Đã bao gồm jfif)
const fileFilter = (req, file, cb) => {
  // Regex cho phép cả jfif
  const allowedTypes = /jpeg|jpg|png|gif|webp|jfif/;

  // Check đuôi file
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type (jfif thường có mime là image/jpeg)
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/jpeg';

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp, jfif)"));
  }
};

// ✅ Cấu hình Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

module.exports = upload;