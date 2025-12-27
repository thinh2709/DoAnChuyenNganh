
require("dotenv").config();
const app = require("./app");
const {
  sequelize,
  testConnection,
  syncDatabase,
} = require("./config/database");
const config = require("./config/env");
const logger = require("./utils/logger");
const { initScheduledJobs, stopScheduledJobs } = require("./utils/cronJobs");

// Hàm khởi động server
const startServer = async () => {
  try {
    // Kiểm tra kết nối database
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error("Không thể kết nối database. Server sẽ không khởi động.");
      process.exit(1);
    }

    // Đồng bộ database (sync models)
    // Lưu ý: Trong production, nên sử dụng migrations thay vì sync
    if (config.server.nodeEnv === "development") {
      await syncDatabase(false); // false = không xóa dữ liệu cũ
    }

    // Khởi động server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(`🚀 Server đang chạy trên port ${PORT}`);
      logger.info(`📝 Environment: ${config.server.nodeEnv}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}/api`);

      // Khởi động Scheduled Jobs sau khi server đã sẵn sàng
      initScheduledJobs();
    });
  } catch (error) {
    logger.error("Lỗi khởi động server", { error: error.message });
    process.exit(1);
  }
};

// Xử lý lỗi không bắt được
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection tại Promise", { reason, promise });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Xử lý tín hiệu dừng server
process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  stopScheduledJobs(); // Dừng cron jobs trước khi đóng server
  await sequelize.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT signal received: closing HTTP server");
  stopScheduledJobs(); // Dừng cron jobs trước khi đóng server
  await sequelize.close();
  process.exit(0);
});

// Khởi động server
startServer();
