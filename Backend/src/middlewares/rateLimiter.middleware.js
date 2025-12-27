const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// ✅ Kiểm tra môi trường development
const isDevelopment = config.server.nodeEnv === 'development';

// ✅ Rate limiter cho API chung
const apiLimiter = isDevelopment
    ? (req, res, next) => next() // Vô hiệu hóa trong development
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 phút
        max: 1000, // Tối đa 1000 requests mỗi 15 phút (đã tăng từ 100)
        message: {
            success: false,
            message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau 15 phút.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

// ✅ Rate limiter nghiêm ngặt hơn cho login
const authLimiter = isDevelopment
    ? (req, res, next) => next() // Vô hiệu hóa trong development
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10, // Tăng từ 5 lên 10 lần đăng nhập trong 15 phút
        message: {
            success: false,
            message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
        },
        skipSuccessfulRequests: true, // Không đếm request thành công
    });

module.exports = {
    apiLimiter,
    authLimiter,
};
