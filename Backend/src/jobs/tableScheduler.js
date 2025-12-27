/**
 * Cron Job tự động quản lý trạng thái bàn
 * Chạy mỗi phút để kiểm tra và cập nhật trạng thái bàn
 */

const cron = require("node-cron");
const { Ban, DatBan } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * Chuyển trạng thái bàn sang "Đã đặt" trước giờ ăn 1 tiếng
 */
const updateTablesBeforeMealTime = async () => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Tìm các đơn đặt bàn sắp đến (trong vòng 1 tiếng tới)
    const upcomingReservations = await DatBan.findAll({
      where: {
        ThoiGianBatDau: {
          [Op.gte]: now,
          [Op.lte]: oneHourLater,
        },
      },
      attributes: ["MaBan"],
      group: ["MaBan"],
    });

    if (upcomingReservations.length > 0) {
      const tableIds = upcomingReservations.map((r) => r.MaBan);

      // Cập nhật trạng thái bàn sang true (Đã đặt/Có người)
      const [updatedCount] = await Ban.update(
        { TrangThai: true },
        {
          where: {
            MaBan: {
              [Op.in]: tableIds,
            },
            TrangThai: false, // Chỉ cập nhật nếu đang trống
          },
        }
      );

      if (updatedCount > 0) {
        logger.info(
          `Đã chuyển ${updatedCount} bàn sang trạng thái "Đã đặt" trước giờ ăn 1 tiếng`,
          {
            tableIds,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }
  } catch (error) {
    logger.error("❌ Lỗi khi cập nhật trạng thái bàn trước giờ ăn", {
      error: error.message,
      stack: error.stack,
    });
  }
};

/**
 * Giải phóng bàn sau khi kết thúc lịch đặt
 */
const releaseTablesAfterMealTime = async () => {
  try {
    const now = new Date();

    // Tìm các đơn đặt đã kết thúc
    const finishedReservations = await DatBan.findAll({
      where: {
        ThoiGianKetThuc: {
          [Op.lt]: now,
        },
      },
      attributes: ["MaBan"],
      group: ["MaBan"],
    });

    if (finishedReservations.length > 0) {
      const tableIds = finishedReservations.map((r) => r.MaBan);

      // Kiểm tra xem bàn có đơn đặt nào đang diễn ra hoặc sắp đến không
      for (const tableId of tableIds) {
        const activeReservation = await DatBan.findOne({
          where: {
            MaBan: tableId,
            [Op.or]: [
              {
                // Đang diễn ra
                ThoiGianBatDau: {
                  [Op.lte]: now,
                },
                ThoiGianKetThuc: {
                  [Op.gte]: now,
                },
              },
              {
                // Sắp đến (trong vòng 1 tiếng tới)
                ThoiGianBatDau: {
                  [Op.gte]: now,
                  [Op.lte]: new Date(now.getTime() + 60 * 60 * 1000),
                },
              },
            ],
          },
        });

        // Nếu không có đơn nào đang active -> Giải phóng bàn
        if (!activeReservation) {
          await Ban.update(
            { TrangThai: false },
            {
              where: {
                MaBan: tableId,
                TrangThai: true,
              },
            }
          );

          logger.info(
            `🔓 Giải phóng bàn #${tableId} sau khi kết thúc lịch đặt`,
            {
              tableId,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }
    }
  } catch (error) {
    logger.error("❌ Lỗi khi giải phóng bàn sau giờ ăn", {
      error: error.message,
      stack: error.stack,
    });
  }
};

/**
 * Khởi động Cron Jobs
 */
const startTableScheduler = () => {
  // Job 1: Kiểm tra và cập nhật trạng thái bàn mỗi phút
  cron.schedule("* * * * *", async () => {
    logger.info("🔄 Chạy Cron Job: Kiểm tra trạng thái bàn");
    await updateTablesBeforeMealTime();
    await releaseTablesAfterMealTime();
  });

  logger.info("✅ Table Scheduler đã được khởi động - Chạy mỗi phút");
  logger.info("📋 Chức năng:");
  logger.info('  - Chuyển bàn sang "Đã đặt" trước giờ ăn 1 tiếng');
  logger.info("  - Giải phóng bàn sau khi kết thúc lịch đặt");
};

module.exports = {
  startTableScheduler,
  updateTablesBeforeMealTime,
  releaseTablesAfterMealTime,
};
