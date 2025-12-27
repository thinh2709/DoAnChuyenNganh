/**
 * Script đồng bộ ENUM type cho DatBan.TrangThai
 * Chạy script này để cập nhật database schema
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const logger = require('./src/utils/logger');

const syncEnumTypes = async () => {
  try {
    logger.info('🔄 Bắt đầu đồng bộ ENUM types...');

    // ✅ Bước 1: Kiểm tra bảng DatBan có tồn tại không
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'DatBan'
      );
    `);

    if (!tableExists[0].exists) {
      logger.error('❌ Bảng DatBan chưa tồn tại. Vui lòng chạy migration hoặc sync models trước.');
      process.exit(1);
    }
    logger.info('✅ Bảng DatBan đã tồn tại');

    // ✅ Bước 2: Kiểm tra column TrangThai có tồn tại không
    const [columnExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'DatBan'
        AND column_name = 'TrangThai'
      );
    `);

    // ✅ Bước 3: Drop old ENUM type và constraint
    await sequelize.query(`
      DO $$ 
      BEGIN
        -- Drop constraint nếu có
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'DatBan_TrangThai_check'
        ) THEN
          ALTER TABLE "DatBan" DROP CONSTRAINT "DatBan_TrangThai_check";
        END IF;

        -- Drop old enum type nếu có
        DROP TYPE IF EXISTS "enum_DatBan_TrangThai" CASCADE;
      END $$;
    `);
    logger.info('✅ Đã xóa ENUM type và constraint cũ');

    // ✅ Bước 4: Tạo ENUM type mới
    await sequelize.query(`
      CREATE TYPE "enum_DatBan_TrangThai" AS ENUM (
        'ChoXacNhan',
        'DaXacNhan', 
        'DaHoanThanh',
        'DaHuy'
      );
    `);
    logger.info('✅ Đã tạo ENUM type mới');

    // ✅ Bước 5: Xử lý column TrangThai
    if (!columnExists[0].exists) {
      // Nếu column chưa tồn tại → Tạo mới
      logger.info('⚠️  Column TrangThai chưa tồn tại. Đang tạo mới...');
      await sequelize.query(`
        ALTER TABLE "DatBan" 
        ADD COLUMN "TrangThai" "enum_DatBan_TrangThai" 
        NOT NULL 
        DEFAULT 'ChoXacNhan';
      `);
      logger.info('✅ Đã tạo column TrangThai');
    } else {
      // Nếu column đã tồn tại → Cập nhật type
      logger.info('ℹ️  Column TrangThai đã tồn tại. Đang cập nhật type...');

      // Cập nhật giá trị hiện tại sang giá trị mới (nếu cần)
      await sequelize.query(`
        DO $$ 
        BEGIN
          -- Update old values to new values
          UPDATE "DatBan" SET "TrangThai" = 'ChoXacNhan' WHERE "TrangThai" = 'CHO_XAC_NHAN';
          UPDATE "DatBan" SET "TrangThai" = 'DaXacNhan' WHERE "TrangThai" = 'DA_DAT';
          UPDATE "DatBan" SET "TrangThai" = 'DaHoanThanh' WHERE "TrangThai" = 'HOAN_THANH';
          UPDATE "DatBan" SET "TrangThai" = 'DaHuy' WHERE "TrangThai" = 'HUY';
        EXCEPTION
          WHEN OTHERS THEN
            NULL; -- Ignore errors if old values don't exist
        END $$;
      `);
      logger.info('✅ Đã cập nhật giá trị cũ (nếu có)');

      // Cập nhật column type
      await sequelize.query(`
        ALTER TABLE "DatBan" 
        ALTER COLUMN "TrangThai" TYPE "enum_DatBan_TrangThai" 
        USING CASE 
          WHEN "TrangThai"::text IN ('ChoXacNhan', 'DaXacNhan', 'DaHoanThanh', 'DaHuy') 
          THEN "TrangThai"::text::"enum_DatBan_TrangThai"
          ELSE 'ChoXacNhan'::"enum_DatBan_TrangThai"
        END;
      `);
      logger.info('✅ Đã cập nhật column type');

      // Set default value
      await sequelize.query(`
        ALTER TABLE "DatBan" 
        ALTER COLUMN "TrangThai" SET DEFAULT 'ChoXacNhan'::"enum_DatBan_TrangThai";
      `);
      logger.info('✅ Đã set default value');

      // Set NOT NULL
      await sequelize.query(`
        ALTER TABLE "DatBan" 
        ALTER COLUMN "TrangThai" SET NOT NULL;
      `);
      logger.info('Đã set NOT NULL constraint');
    }

    logger.info('Hoàn tất đồng bộ ENUM types!');
    logger.info('');
    logger.info('Các giá trị ENUM hiện tại:');
    logger.info('   - ChoXacNhan: Chờ xác nhận');
    logger.info('   - DaXacNhan: Đã xác nhận (Cron Job sẽ tìm giá trị này)');
    logger.info('   - DaHoanThanh: Đã hoàn thành');
    logger.info('   - DaHuy: Đã hủy');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Lỗi khi đồng bộ ENUM types:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Chạy script
syncEnumTypes();
