/**
 * Model DatBan (Reservation) - Đặt bàn
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DatBan = sequelize.define('DatBan', {
  MaDatBan: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'MaDatBan'
  },
  MaKH: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'KhachHang',
      key: 'MaKhachHang'
    },
    field: 'MaKH'
  },
  MaBan: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Ban',
      key: 'MaBan'
    },
    field: 'MaBan'
  },
  NgayDat: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'NgayDat'
  },
  ThoiGianBatDau: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'ThoiGianBatDau'
  },
  ThoiGianKetThuc: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'ThoiGianKetThuc'
  },
  SoNguoi: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 20
    },
    field: 'SoNguoi'
  },
  GhiChu: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'GhiChu'
  },
  TrangThai: {
    type: DataTypes.ENUM('ChoXacNhan', 'DaXacNhan', 'DaHoanThanh', 'DaHuy'),
    allowNull: false,
    defaultValue: 'ChoXacNhan',
    field: 'TrangThai'
  }
}, {
  tableName: 'DatBan',
  timestamps: false
});

module.exports = DatBan;

