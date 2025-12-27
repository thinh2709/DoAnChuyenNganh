/**
 * Controller xử lý API cho Ban (Tables)
 */

const { Ban, DatBan } = require('../models');
const logger = require('../utils/logger');

// Danh sách bàn
const getAllTables = async (req, res, next) => {
  try {
    const tables = await Ban.findAll({ order: [['MaBan', 'ASC']] });
    return res.json({ success: true, message: 'Lấy danh sách bàn thành công', data: tables });
  } catch (error) {
    logger.error('Lỗi lấy danh sách bàn', { error: error.message });
    next(error);
  }
};

// Lấy theo id
const getTableById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const table = await Ban.findByPk(id);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    }
    return res.json({ success: true, message: 'Lấy thông tin bàn thành công', data: table });
  } catch (error) {
    logger.error('Lỗi lấy bàn theo id', { error: error.message });
    next(error);
  }
};

// Tạo bàn
const createTable = async (req, res, next) => {
  try {
    const { TenBan, SucChua, TrangThai } = req.body;
    if (!TenBan || !SucChua) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập TenBan và SucChua' });
    }
    const created = await Ban.create({ TenBan, SucChua: parseInt(SucChua), TrangThai: !!TrangThai });
    return res.status(201).json({ success: true, message: 'Tạo bàn thành công', data: created });
  } catch (error) {
    logger.error('Lỗi tạo bàn', { error: error.message });
    next(error);
  }
};

// Cập nhật bàn
const updateTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { TenBan, SucChua, TrangThai, SoLuongDatCho } = req.body;
    const table = await Ban.findByPk(id);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    }
    if (TenBan) table.TenBan = TenBan;
    if (SucChua !== undefined) table.SucChua = parseInt(SucChua);
    if (TrangThai) table.TrangThai = TrangThai; // ✅ Fix: Nhận ENUM string, không convert boolean
    if (SoLuongDatCho !== undefined) table.SoLuongDatCho = parseInt(SoLuongDatCho);
    await table.save();
    return res.json({ success: true, message: 'Cập nhật bàn thành công', data: table });
  } catch (error) {
    logger.error('Lỗi cập nhật bàn', { error: error.message });
    next(error);
  }
};

// Xóa bàn (chặn nếu có đặt bàn tương lai)
const deleteTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const table = await Ban.findByPk(id);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    }
    const hasUpcoming = await DatBan.count({ where: { MaBan: id } });
    if (hasUpcoming > 0) {
      return res.status(400).json({ success: false, message: 'Không thể xóa bàn vì có lịch đặt liên quan' });
    }
    await table.destroy();
    return res.json({ success: true, message: 'Xóa bàn thành công' });
  } catch (error) {
    logger.error('Lỗi xóa bàn', { error: error.message });
    next(error);
  }
};

module.exports = {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable
};
