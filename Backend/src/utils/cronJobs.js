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
 */
const updateTableStatusBeforeReservation = cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        // ✅ FIX TIMEZONE: Database lưu giờ VN, nhưng khi lấy lên bị -7h
        // Nên cần cộng 7h vào now để so sánh chính xác
        const nowAdjusted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const thirtyMinutesLater = new Date(nowAdjusted.getTime() + 30 * 60 * 1000);

        // DEBUG: Log thời gian để kiểm tra
        logger.info(`⏰ Cron check - Now: ${now.toISOString()} | Adjusted (+7h): ${nowAdjusted.toISOString()} | +30min: ${thirtyMinutesLater.toISOString()}`);

        // Tìm các đặt bàn sắp đến giờ (trong vòng 30 phút tới)
        // ✅ FIX: Tìm cả 'ChoXacNhan' và 'DaXacNhan'
        const upcomingReservations = await DatBan.findAll({
            where: {
                TrangThai: {
                    [Op.in]: ['ChoXacNhan', 'DaXacNhan']
                },
                ThoiGianBatDau: {
                    [Op.gte]: nowAdjusted,
                    [Op.lte]: thirtyMinutesLater
                }
            },
            include: [{
                model: Ban,
                as: 'ban',
                where: {
                    TrangThai: 'TRONG'
                },
                required: false
            }]
        });

        if (upcomingReservations.length > 0) {
            logger.info(`🕐 Tìm thấy ${upcomingReservations.length} đặt bàn sắp đến giờ`);

            for (const reservation of upcomingReservations) {
                const ban = await Ban.findByPk(reservation.MaBan);

                if (ban && ban.TrangThai === 'TRONG') {
                    await ban.update({ TrangThai: 'DAT_TRUOC' });

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
    scheduled: false,
    timezone: 'Asia/Ho_Chi_Minh'
});

/**
 * Cron Job: Tự động giải phóng bàn sau khi hết giờ đặt
 * Chạy mỗi 5 phút
 */
const releaseTableAfterReservation = cron.schedule('*/5 * * * *', async () => {
    try {
        const now = new Date();
        // ✅ FIX TIMEZONE: Cộng 7h để match với database
        const nowAdjusted = new Date(now.getTime() + 7 * 60 * 60 * 1000);

        // Tìm các đặt bàn đã hết giờ
        const expiredReservations = await DatBan.findAll({
            where: {
                TrangThai: {
                    [Op.in]: ['ChoXacNhan', 'DaXacNhan']
                },
                ThoiGianKetThuc: {
                    [Op.lt]: nowAdjusted
                }
            },
            include: [{
                model: Ban,
                as: 'ban',
                where: {
                    TrangThai: 'DAT_TRUOC'
                },
                required: false
            }]
        });

        if (expiredReservations.length > 0) {
            logger.info(`🔓 Tìm thấy ${expiredReservations.length} bàn cần giải phóng`);

            for (const reservation of expiredReservations) {
                const ban = await Ban.findByPk(reservation.MaBan);
                if (ban && ban.TrangThai === 'DAT_TRUOC') {
                    await ban.update({ TrangThai: 'TRONG' });
                    logger.info(`✅ Đã giải phóng bàn ${ban.TenBan} (${ban.MaBan}) sau đặt bàn #${reservation.MaDatBan}`);
                }

                await reservation.update({ TrangThai: 'DaHoanThanh' });
                logger.info(`📋 Đã cập nhật đặt bàn #${reservation.MaDatBan} thành 'Đã hoàn thành'`);
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
