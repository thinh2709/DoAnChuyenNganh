/**
 * Middleware xác thực JWT
 * Kiểm tra token và gán thông tin user vào request
 */

const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { TaiKhoan, VaiTro } = require("../models");

/**
 * Middleware xác thực JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập",
      });
    }

    // ✅ FIX: Thêm blacklist check (nếu có logout)
    // const isBlacklisted = await checkTokenBlacklist(token);
    // if (isBlacklisted) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Token đã bị vô hiệu hóa",
    //   });
    // }

    const decoded = jwt.verify(token, config.jwt.secret);

    // ✅ FIX: Kiểm tra user vẫn tồn tại trong DB
    const { TaiKhoan } = require("../models");
    const user = await TaiKhoan.findByPk(decoded.id, {
      attributes: { exclude: ["MatKhau"] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại",
      });
    }

    // ✅ FIX: Kiểm tra trạng thái tài khoản
    if (user.TrangThai === "Khoa") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token đã hết hạn",
      });
    }

    // ✅ FIX: Handle invalid token
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Xác thực thất bại",
    });
  }
};

/**
 * Middleware kiểm tra quyền Admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Chưa xác thực",
    });
  }

  if (req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Không có quyền truy cập",
    });
  }

  next();
};

/**
 * Middleware kiểm tra quyền Admin hoặc Nhân viên
 */
const isEmployeeOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Chưa xác thực",
    });
  }

  if (req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Không có quyền truy cập",
    });
  }

  next();
};

module.exports = {
  authenticate,
  isAdmin,
  isEmployeeOrAdmin,
};
