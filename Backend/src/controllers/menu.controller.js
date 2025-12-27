/**
 * Controller xử lý API cho Menu (MonAn)
 * CRUD món ăn
 */

const { MonAn, LoaiMon } = require('../models');
const logger = require('../utils/logger');
const sequelize = require('../config/database').sequelize;

/**
 * Lấy tất cả món ăn
 */
const getAllMenu = async (req, res, next) => {
  try {
    const menuItems = await MonAn.findAll({
      include: [{
        model: LoaiMon,
        as: 'loaiMon',
        attributes: ['MaLoai', 'TenLoai']
      }],
      order: [['TenMon', 'ASC']]
    });

    // Tính giá sau giảm (nếu có khuyến mãi)
    const menuWithDiscount = menuItems.map(item => {
      const itemData = item.toJSON();
      // TODO: Tính giá sau giảm nếu có khuyến mãi
      itemData.GiaSauGiam = itemData.Gia;
      return itemData;
    });

    return res.json({
      success: true,
      message: 'Lấy danh sách món ăn thành công',
      data: menuWithDiscount
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách món ăn', { error: error.message });
    next(error);
  }
};

/**
 * Lấy món ăn theo ID
 */
const getMenuById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menuItem = await MonAn.findByPk(id, {
      include: [{
        model: LoaiMon,
        as: 'loaiMon'
      }]
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy món ăn'
      });
    }

    return res.json({
      success: true,
      message: 'Lấy thông tin món ăn thành công',
      data: menuItem
    });
  } catch (error) {
    logger.error('Lỗi lấy món ăn', { error: error.message });
    next(error);
  }
};

/**
 * Lấy danh sách loại món
 */
const getLoaiMon = async (req, res, next) => {
  try {
    const loaiMons = await LoaiMon.findAll({
      include: [{
        model: MonAn,
        as: 'monAns',
        attributes: ['HinhAnh'],
        limit: 1
      }]
    });

    const result = loaiMons.map(loai => {
      const loaiData = loai.toJSON();
      loaiData.hinhAnh = loaiData.monAns?.[0]?.HinhAnh || '';
      delete loaiData.monAns;
      return loaiData;
    });

    return res.json({
      success: true,
      message: 'Lấy danh sách loại món thành công',
      data: result
    });
  } catch (error) {
    logger.error('Lỗi lấy loại món', { error: error.message });
    next(error);
  }
};

/**
 * Đếm số lượng món ăn
 */
const getMenuCount = async (req, res, next) => {
  try {
    const count = await MonAn.count();

    return res.json({
      success: true,
      message: 'Lấy số lượng món ăn thành công',
      data: { count }
    });
  } catch (error) {
    logger.error('Lỗi đếm món ăn', { error: error.message });
    next(error);
  }
};

/**
 * Tạo món ăn mới
 */
const createMenu = async (req, res, next) => {
  try {
    const { TenMon, Gia, MaLoai } = req.body;

    // Validation
    if (!TenMon || !Gia || !MaLoai) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin'
      });
    }

    // Kiểm tra loại món tồn tại
    const loaiMon = await LoaiMon.findByPk(MaLoai);
    if (!loaiMon) {
      return res.status(400).json({
        success: false,
        message: 'Loại món không tồn tại'
      });
    }

    // Xử lý upload hình ảnh
    let hinhAnh = '';
    if (req.file) {
      // Hỗ trợ cả S3 (location) và Local (filename)
      // Chỉ dùng S3 location
      if (req.file.location) {
        hinhAnh = req.file.location;
      } else {
        // Trường hợp lỗi bất thường không có location dù đã qua middleware
        return res.status(500).json({
           success: false,
           message: 'Lỗi upload ảnh lên S3 (không nhận được location)'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn hình ảnh'
      });
    }

    // Tạo món ăn mới
    const newMenu = await MonAn.create({
      TenMon,
      Gia: parseFloat(Gia),
      MaLoai: parseInt(MaLoai),
      HinhAnh: hinhAnh
    });

    // Lấy món ăn với thông tin đầy đủ
    const menuItem = await MonAn.findByPk(newMenu.MaMon, {
      include: [{
        model: LoaiMon,
        as: 'loaiMon'
      }]
    });

    logger.info('Tạo món ăn thành công', { maMon: menuItem.MaMon, tenMon: menuItem.TenMon });

    return res.status(201).json({
      success: true,
      message: 'Tạo món ăn thành công',
      data: menuItem
    });
  } catch (error) {
    logger.error('Lỗi tạo món ăn', { error: error.message });
    next(error);
  }
};

/**
 * Cập nhật món ăn
 */
const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { TenMon, Gia, MaLoai } = req.body;

    const menuItem = await MonAn.findByPk(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy món ăn'
      });
    }

    // Kiểm tra loại món nếu có thay đổi
    if (MaLoai) {
      const loaiMon = await LoaiMon.findByPk(MaLoai);
      if (!loaiMon) {
        return res.status(400).json({
          success: false,
          message: 'Loại món không tồn tại'
        });
      }
      menuItem.MaLoai = parseInt(MaLoai);
    }

    // Cập nhật thông tin
    if (TenMon) menuItem.TenMon = TenMon;
    if (Gia) menuItem.Gia = parseFloat(Gia);

    // Xử lý upload hình ảnh mới
    if (req.file) {
      if (req.file.location) {
        // Lưu URL đầy đủ từ S3
        menuItem.HinhAnh = req.file.location;
      } else {
         return res.status(500).json({
           success: false,
           message: 'Lỗi upload ảnh cập nhật lên S3 (không nhận được location)'
        });
      }
    }

    await menuItem.save();

    // Lấy món ăn với thông tin đầy đủ
    const updatedMenu = await MonAn.findByPk(id, {
      include: [{
        model: LoaiMon,
        as: 'loaiMon'
      }]
    });

    return res.json({
      success: true,
      message: 'Cập nhật món ăn thành công',
      data: updatedMenu
    });
  } catch (error) {
    logger.error('Lỗi cập nhật món ăn', { error: error.message });
    next(error);
  }
};

/**
 * Xóa món ăn
 */
const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menuItem = await MonAn.findByPk(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy món ăn'
      });
    }

    // Lưu ý: Với S3, không cần xóa file khi xóa record
    // Có thể implement xóa file từ S3 nếu cần (sử dụng AWS SDK)

    await menuItem.destroy();

    return res.json({
      success: true,
      message: 'Xóa món ăn thành công'
    });
  } catch (error) {
    logger.error('Lỗi xóa món ăn', { error: error.message });
    next(error);
  }
};

/**
 * ✅ NEW: Lấy danh sách Best Sellers (Món bán chạy nhất)
 */
const getBestSellers = async (req, res, next) => {
  try {
    const { limit = 4 } = req.query;

    // ✅ FIX: Validate và sanitize limit
    const validLimit = parseInt(limit);
    if (isNaN(validLimit) || validLimit < 1 || validLimit > 50) {
      return res.status(400).json({
        success: false,
        message: "Limit phải là số từ 1 đến 50",
      });
    }

    // ✅ Query lấy top món ăn bán chạy nhất từ ChiTietDonHang
    const bestSellers = await sequelize.query(
      `
      SELECT 
        m."MaMon",
        m."TenMon",
        m."HinhAnh",
        m."Gia",
        m."MaLoai",
        l."TenLoai",
        SUM(ctdh."SoLuong") as "TongSoLuong",
        COUNT(DISTINCT ctdh."MaDonHang") as "SoDonHang"
      FROM "ChiTietDonHang" ctdh
      INNER JOIN "MonAn" m ON ctdh."MaMon" = m."MaMon"
      LEFT JOIN "LoaiMon" l ON m."MaLoai" = l."MaLoai"
      INNER JOIN "DonHang" dh ON ctdh."MaDonHang" = dh."MaDonHang"
      WHERE dh."TrangThai" != 'DaHuy'
      GROUP BY m."MaMon", m."TenMon", m."HinhAnh", m."Gia", m."MaLoai", l."TenLoai"
      ORDER BY "TongSoLuong" DESC
      LIMIT :limit
      `,
      {
        replacements: { limit: validLimit }, // ✅ Parameterized query
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // ✅ Format data
    const formattedData = bestSellers.map((item) => ({
      MaMon: item.MaMon,
      TenMon: item.TenMon,
      HinhAnh: item.HinhAnh,
      Gia: parseFloat(item.Gia),
      loaiMon: {
        MaLoai: item.MaLoai,
        TenLoai: item.TenLoai,
      },
      isBestSeller: true,
      totalSold: parseInt(item.TongSoLuong),
      orderCount: parseInt(item.SoDonHang),
    }));

    logger.info(`Lấy ${formattedData.length} món Best Sellers thành công`);

    return res.json({
      success: true,
      message: "Lấy danh sách Best Sellers thành công",
      data: formattedData,
    });
  } catch (error) {
    logger.error("Lỗi lấy Best Sellers", { error: error.message });
    next(error);
  }
};

module.exports = {
  getAllMenu,
  getMenuById,
  getLoaiMon,
  getMenuCount,
  createMenu,      // ✅ Export createMenu
  updateMenu,      // ✅ Export updateMenu
  deleteMenu,      // ✅ Export deleteMenu
  getBestSellers,
};

