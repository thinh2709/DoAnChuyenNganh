/**
 * Controller xử lý API cho LichLamViec (Work Schedule)
 */

const { LichLamViec, NhanVien, CaLamViec } = require('../models');
const logger = require('../utils/logger');

// Lấy tất cả lịch làm việc
const getAllWorkSchedules = async (req, res, next) => {
  try {
    const { startDate, endDate, maNhanVien } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.NgayLamViec = {
        [require('sequelize').Op.between]: [startDate, endDate]
      };
    }
    if (maNhanVien) {
      where.MaNhanVien = maNhanVien;
    }

    const schedules = await LichLamViec.findAll({
      where,
      include: [
        {
          model: NhanVien,
          as: 'nhanVien'
        },
        {
          model: CaLamViec,
          as: 'caLamViec'
        }
      ],
      order: [['NgayLamViec', 'DESC'], ['MaNhanVien', 'ASC']]
    });
    return res.json({ success: true, message: 'Lấy danh sách lịch làm việc thành công', data: schedules });
  } catch (error) {
    logger.error('Lỗi lấy danh sách lịch làm việc', { error: error.message });
    next(error);
  }
};

// Lấy lịch làm việc theo id
const getWorkScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await LichLamViec.findByPk(id, {
      include: [
        {
          model: NhanVien,
          as: 'nhanVien'
        },
        {
          model: CaLamViec,
          as: 'caLamViec'
        }
      ]
    });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch làm việc' });
    }
    return res.json({ success: true, message: 'Lấy thông tin lịch làm việc thành công', data: schedule });
  } catch (error) {
    logger.error('Lỗi lấy lịch làm việc theo id', { error: error.message });
    next(error);
  }
};

// Tạo lịch làm việc
const createWorkSchedule = async (req, res, next) => {
  try {
    const { NgayLamViec, MaNhanVien, MaCa } = req.body;
    if (!NgayLamViec || !MaNhanVien || !MaCa) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin lịch làm việc' });
    }

    // Kiểm tra nhân viên tồn tại
    const employee = await NhanVien.findByPk(MaNhanVien);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    // Kiểm tra ca làm việc tồn tại
    const shift = await CaLamViec.findByPk(MaCa);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc' });
    }

    // Kiểm tra trùng lịch (unique constraint)
    const exists = await LichLamViec.findOne({
      where: {
        NgayLamViec,
        MaNhanVien,
        MaCa
      }
    });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Lịch làm việc đã tồn tại' });
    }

    const created = await LichLamViec.create({ NgayLamViec, MaNhanVien, MaCa });
    return res.status(201).json({ success: true, message: 'Tạo lịch làm việc thành công', data: created });
  } catch (error) {
    logger.error('Lỗi tạo lịch làm việc', { error: error.message });
    next(error);
  }
};

// Cập nhật lịch làm việc
const updateWorkSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { NgayLamViec, MaNhanVien, MaCa } = req.body;

    const schedule = await LichLamViec.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch làm việc' });
    }

    if (MaNhanVien) {
      const employee = await NhanVien.findByPk(MaNhanVien);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
      }
      schedule.MaNhanVien = MaNhanVien;
    }
    if (MaCa) {
      const shift = await CaLamViec.findByPk(MaCa);
      if (!shift) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc' });
      }
      schedule.MaCa = MaCa;
    }
    if (NgayLamViec) schedule.NgayLamViec = NgayLamViec;

    // Kiểm tra trùng lịch nếu có thay đổi
    if (NgayLamViec || MaNhanVien || MaCa) {
      const exists = await LichLamViec.findOne({
        where: {
          NgayLamViec: schedule.NgayLamViec,
          MaNhanVien: schedule.MaNhanVien,
          MaCa: schedule.MaCa,
          MaLich: { [require('sequelize').Op.ne]: id }
        }
      });
      if (exists) {
        return res.status(409).json({ success: false, message: 'Lịch làm việc đã tồn tại' });
      }
    }

    await schedule.save();
    return res.json({ success: true, message: 'Cập nhật lịch làm việc thành công', data: schedule });
  } catch (error) {
    logger.error('Lỗi cập nhật lịch làm việc', { error: error.message });
    next(error);
  }
};

// Xóa lịch làm việc
const deleteWorkSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await LichLamViec.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch làm việc' });
    }

    await schedule.destroy();
    return res.json({ success: true, message: 'Xóa lịch làm việc thành công' });
  } catch (error) {
    logger.error('Lỗi xóa lịch làm việc', { error: error.message });
    next(error);
  }
};

module.exports = {
  getAllWorkSchedules,
  getWorkScheduleById,
  createWorkSchedule,
  updateWorkSchedule,
  deleteWorkSchedule
};

