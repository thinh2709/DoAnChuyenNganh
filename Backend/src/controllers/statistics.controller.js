/**
 * Controller xử lý API cho Statistics (Thống kê)
 */

const { DonHang, ChiTietDonHang, MonAn, KhachHang } = require("../models");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

// Lấy thống kê dashboard
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Tổng doanh thu
    const totalRevenue =
      (await DonHang.sum("TongTien", {
        where: {
          TrangThai: {
            [Op.not]: "DaHuy",
          },
        },
      })) || 0;

    // Đếm đơn hàng mới hôm nay
    const todayOrders = await DonHang.count({
      where: {
        NgayDat: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      },
    });

    // Đếm khách hàng mới hôm nay (dựa vào đơn hàng đầu tiên)
    const todayCustomers = await DonHang.count({
      distinct: true,
      col: "KhachHangID",
      where: {
        NgayDat: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      },
    });

    // Doanh thu hôm nay
    const todayRevenue =
      (await DonHang.sum("TongTien", {
        where: {
          NgayDat: {
            [Op.gte]: today,
            [Op.lt]: tomorrow,
          },
          TrangThai: {
            [Op.not]: "DaHuy",
          },
        },
      })) || 0;

    return res.json({
      success: true,
      message: "Lấy thống kê dashboard thành công",
      data: {
        totalRevenue: parseFloat(totalRevenue),
        todayOrders,
        todayCustomers,
        todayRevenue: parseFloat(todayRevenue),
      },
    });
  } catch (error) {
    logger.error("Lỗi lấy thống kê dashboard", { error: error.message });
    next(error);
  }
};

// Lấy doanh thu theo thời gian
const getRevenueOverTime = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = "day" } = req.query;

    let dateFormat;
    if (groupBy === "month") {
      dateFormat = sequelize.fn(
        "DATE_TRUNC",
        "month",
        sequelize.col("NgayDat")
      );
    } else if (groupBy === "year") {
      dateFormat = sequelize.fn("DATE_TRUNC", "year", sequelize.col("NgayDat"));
    } else {
      dateFormat = sequelize.fn("DATE", sequelize.col("NgayDat"));
    }

    const where = {
      TrangThai: {
        [Op.not]: "DaHuy",
      },
    };

    if (startDate && endDate) {
      where.NgayDat = {
        [Op.between]: [startDate, endDate],
      };
    }

    const revenueData = await DonHang.findAll({
      attributes: [
        [dateFormat, "date"],
        [sequelize.fn("SUM", sequelize.col("TongTien")), "revenue"],
        [sequelize.fn("COUNT", sequelize.col("MaDonHang")), "orderCount"],
      ],
      where,
      group: [sequelize.col("date")],
      order: [[sequelize.col("date"), "ASC"]],
      raw: true,
    });

    return res.json({
      success: true,
      message: "Lấy doanh thu theo thời gian thành công",
      data: revenueData.map((item) => ({
        date: item.date,
        revenue: parseFloat(item.revenue || 0),
        orderCount: parseInt(item.orderCount || 0),
      })),
    });
  } catch (error) {
    logger.error("Lỗi lấy doanh thu theo thời gian", { error: error.message });
    next(error);
  }
};

// Lấy top sản phẩm bán chạy
const getTopSellingProducts = async (req, res, next) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where["$donHang.NgayDat$"] = {
        [Op.between]: [startDate, endDate],
      };
    }

    // ✅ FIX: Specify table name to avoid ambiguous column reference
    const topProducts = await ChiTietDonHang.findAll({
      attributes: [
        [sequelize.col("ChiTietDonHang.MaMon"), "MaMon"], // ✅ FIXED: Chỉ định rõ table
        [sequelize.fn("SUM", sequelize.col("ChiTietDonHang.SoLuong")), "totalQuantity"], // ✅ FIXED
        [sequelize.fn("SUM", sequelize.col("ChiTietDonHang.ThanhTien")), "totalRevenue"], // ✅ FIXED
      ],
      include: [
        {
          model: MonAn,
          as: "monAn",
          attributes: ["MaMon", "TenMon", "Gia"], // ✅ Keep MaMon để verify
        },
        {
          model: DonHang,
          as: "donHang",
          attributes: [],
          where: {
            TrangThai: {
              [Op.not]: "DaHuy",
            },
          },
          required: true,
        },
      ],
      where,
      group: [
        "ChiTietDonHang.MaMon", // ✅ FIXED: Chỉ định rõ table
        "monAn.MaMon",          // ✅ FIXED: Thêm để tránh lỗi
        "monAn.TenMon",
        "monAn.Gia",
      ],
      order: [[sequelize.fn("SUM", sequelize.col("ChiTietDonHang.SoLuong")), "DESC"]], // ✅ FIXED
      limit: parseInt(limit),
      raw: false,
    });

    const result = topProducts.map((item) => ({
      maMon: item.dataValues.MaMon,
      tenMon: item.monAn?.TenMon || "N/A",
      gia: parseFloat(item.monAn?.Gia || 0),
      totalQuantity: parseInt(item.dataValues.totalQuantity || 0),
      totalRevenue: parseFloat(item.dataValues.totalRevenue || 0),
    }));

    return res.json({
      success: true,
      message: "Lấy top sản phẩm bán chạy thành công",
      data: result,
    });
  } catch (error) {
    logger.error("Lỗi lấy top sản phẩm bán chạy", { error: error.message });
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRevenueOverTime,
  getTopSellingProducts,
};
