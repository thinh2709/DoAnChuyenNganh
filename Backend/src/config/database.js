/**
 * Cấu hình kết nối PostgreSQL với Sequelize ORM
 * Hỗ trợ kết nối tới AWS RDS PostgreSQL
 */

const { Sequelize } = require("sequelize");
const config = require("./env");

// Tạo instance Sequelize
// Nếu có DATABASE_URL (thường từ AWS RDS), sử dụng nó
// Nếu không, sử dụng các biến môi trường riêng lẻ
let sequelize;

if (config.database.url) {
  // Kết nối qua connection string (AWS RDS thường dùng cách này)
  sequelize = new Sequelize(config.database.url, {
    dialect: "postgres",
    logging: false,
    pool: config.database.pool,
    dialectOptions: {
      ssl:
        process.env.DB_SSL === "true"
          ? {
            require: true,
            rejectUnauthorized: false,
          }
          : false,
    },
  });
} else {
  // Kết nối qua các tham số riêng lẻ
  sequelize = new Sequelize(
    config.database.database,
    config.database.username,
    config.database.password,
    {
      host: config.database.host,
      port: config.database.port,
      dialect: config.database.dialect,
      logging: false,
      pool: config.database.pool,
      dialectOptions: {
        ssl:
          process.env.DB_SSL === "true"
            ? {
              require: true,
              rejectUnauthorized: false,
            }
            : false,
      },
    }
  );
}

// Hàm kiểm tra kết nối database
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Kết nối database thành công!");
    return true;
  } catch (error) {
    console.error("❌ Không thể kết nối database:", error.message);
    return false;
  }
};

// Hàm đồng bộ database (sync models)
const syncDatabase = async (force = false) => {
  if (process.env.DB_SYNC !== 'true') {
    console.log("⏩ Bỏ qua đồng bộ Database (Chế độ khởi động nhanh).");
    return true;
  }

  try {
    console.log("🔄 Đang đồng bộ Database (Vui lòng chờ)...");
    console.log("⚠️  ALTER MODE: Sequelize sẽ cập nhật schema mà không xóa dữ liệu");

    // alter: true sẽ thay đổi cột nếu cần (BOOLEAN -> STRING)
    await sequelize.sync({ force, alter: true, logging: console.log });

    console.log("✅ Đồng bộ database thành công!");
    console.log("✅ Cột TrangThai đã được cập nhật sang kiểu STRING");
    return true;
  } catch (error) {
    console.error("❌ Lỗi đồng bộ database:", error.message);
    console.error("💡 Nếu gặp lỗi, hãy chạy migration thủ công:");
    console.error("   ALTER TABLE \"Ban\" ALTER COLUMN \"TrangThai\" TYPE VARCHAR(255);");
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
};
