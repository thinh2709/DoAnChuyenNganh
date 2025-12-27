/**
 * Scheduled Jobs - Cron Jobs tự động
 * Quản lý các tác vụ định kỳ trong hệ thống
 */

const cron = require('node-cron');
const { DatBan, Ban } = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger');

/**
 * Cron Job: Tự động cập nhật trạng thái bàn 30 phút trước giờ đặt
 * Chạy mỗi phút để kiểm tra
 * 
 * Lưu ý: TrangThai trong model Ban là BOOLEAN
 * - true = Bàn trống (available)
 * - false = Bàn đã đặt (reserved)
 */
const updateTableStatusBeforeReservation = cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

        // Tìm các đặt bàn đã xác nhận và sắp đến giờ (trong vòng 30 phút tới)
        const upcomingReservations = await DatBan.findAll({
            where: {
                TrangThai: 'DaXacNhan',
                ThoiGianBatDau: {
                    [Op.gte]: now,
                    [Op.lte]: thirtyMinutesLater
                }
            },
            include: [{
                model: Ban,
                as: 'ban',
                where: {
                    TrangThai: 'TRONG' // true = Bàn trống
                }
            }]
        });

        if (upcomingReservations.length > 0) {
            logger.info(`🕐 Tìm thấy ${upcomingReservations.length} đặt bàn sắp đến giờ`);

            // Update trạng thái bàn
            for (const reservation of upcomingReservations) {
                const ban = await Ban.findByPk(reservation.MaBan);

                if (ban && ban.TrangThai === 'TRONG') {
                    await ban.update({ TrangThai: 'DAT_TRUOC' }); // false = Đã đặt

                    logger.info(`✅ Đã cập nhật bàn ${ban.TenBan} (${ban.MaBan}) sang trạng thái 'Đã Đặt' cho đặt bàn #${reservation.MaDatBan}`);
                    logger.info(`📅 Thời gian đến: ${reservation.ThoiGianBatDau.toLocaleString('vi-VN')}`);
                }
            }
        }
    } catch (error) {
        logger.error('❌ Lỗi trong cron job updateTableStatusBeforeReservation', {
            error: error.message,
            stack: error.stack
        });
    }
}, {
    scheduled: false, // Không tự động chạy khi khởi tạo
    timezone: 'Asia/Ho_Chi_Minh' // Múi giờ Việt Nam
});

/**
 * Cron Job: Tự động giải phóng bàn sau khi hết giờ đặt
 * Chạy mỗi 5 phút
 */
const releaseTableAfterReservation = cron.schedule('*/5 * * * *', async () => {
    try {
        const now = new Date();

        // Tìm các đặt bàn đã hết giờ
        const expiredReservations = await DatBan.findAll({
            where: {
                TrangThai: 'DaXacNhan',
                ThoiGianKetThuc: {
                    [Op.lt]: now
                }
            },
            include: [{
                model: Ban,
                as: 'ban',
                where: {
                    TrangThai: 'DAT_TRUOC' // false = Đã đặt
                }
            }]
        });

        if (expiredReservations.length > 0) {
            logger.info(`🔓 Tìm thấy ${expiredReservations.length} bàn cần giải phóng`);

            for (const reservation of expiredReservations) {
                const ban = await Ban.findByPk(reservation.MaBan);

                if (ban && ban.TrangThai === 'DAT_TRUOC') {
                    await ban.update({ TrangThai: 'TRONG' }); // true = Trống

                    logger.info(`✅ Đã giải phóng bàn ${ban.TenBan} (${ban.MaBan}) sau đặt bàn #${reservation.MaDatBan}`);
                }
            }
        }
    } catch (error) {
        logger.error('❌ Lỗi trong cron job releaseTableAfterReservation', {
            error: error.message
        });
    }
}, {
    scheduled: false,
    timezone: 'Asia/Ho_Chi_Minh'
});

/**
 * Khởi tạo tất cả scheduled jobs
 */
const initScheduledJobs = () => {
    logger.info('🚀 Khởi động Scheduled Jobs...');

    // Start cron job update trạng thái bàn trước 30 phút
    updateTableStatusBeforeReservation.start();
    logger.info('✅ [Cron Job] Auto-update table status 30 minutes before reservation - ACTIVE');

    // Start cron job giải phóng bàn sau khi hết giờ
    releaseTableAfterReservation.start();
    logger.info('✅ [Cron Job] Auto-release tables after reservation ends - ACTIVE');

    logger.info('🎯 Tất cả Scheduled Jobs đã được khởi động');
};

/**
 * Dừng tất cả scheduled jobs
 */
const stopScheduledJobs = () => {
    updateTableStatusBeforeReservation.stop();
    releaseTableAfterReservation.stop();
    logger.info('🛑 Đã dừng tất cả Scheduled Jobs');
};

module.exports = {
    initScheduledJobs,
    stopScheduledJobs,
    updateTableStatusBeforeReservation,
    releaseTableAfterReservation
};
