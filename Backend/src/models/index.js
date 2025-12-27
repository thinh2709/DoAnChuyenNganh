/**
 * File index để import tất cả models và thiết lập relationships
 */

const { sequelize } = require("../config/database");
const VaiTro = require("./VaiTro");
const TaiKhoan = require("./TaiKhoan");
const LoaiMon = require("./LoaiMon");
const MonAn = require("./MonAn");
const KhachHang = require("./KhachHang"); // ✅ Đảm bảo import đúng
const Ban = require("./Ban");
const DonHang = require("./DonHang");
const ChiTietDonHang = require("./ChiTietDonHang");
const DatBan = require("./DatBan");
const DatBanMonAn = require("./DatBanMonAn");
const NhaCungCap = require("./NhaCungCap");
const NguyenVatLieu = require("./NguyenVatLieu");
const PhongBan = require("./PhongBan");
const NhanVien = require("./NhanVien");
const CaLamViec = require("./CaLamViec");
const LichLamViec = require("./LichLamViec");
const KhuyenMai = require("./KhuyenMai");

// ✅ Kiểm tra KhachHang có được import đúng không
console.log("✅ KhachHang model:", typeof KhachHang); // Phải log "function"

// Định nghĩa relationships

// VaiTro - TaiKhoan (1-N)
VaiTro.hasMany(TaiKhoan, { foreignKey: "MaVaiTro", as: "taiKhoans" });
TaiKhoan.belongsTo(VaiTro, { foreignKey: "MaVaiTro", as: "vaiTro" });

// LoaiMon - MonAn (1-N)
LoaiMon.hasMany(MonAn, { foreignKey: "MaLoai", as: "monAns" });
MonAn.belongsTo(LoaiMon, { foreignKey: "MaLoai", as: "loaiMon" });

// ✅ KhachHang - DonHang (1-N)
KhachHang.hasMany(DonHang, { foreignKey: "KhachHangID", as: "donHangs" });
DonHang.belongsTo(KhachHang, { foreignKey: "KhachHangID", as: "khachHang" });

// DonHang - ChiTietDonHang (1-N)
DonHang.hasMany(ChiTietDonHang, {
  foreignKey: "MaDonHang",
  as: "chiTietDonHang",
});
ChiTietDonHang.belongsTo(DonHang, { foreignKey: "MaDonHang", as: "donHang" });

// MonAn - ChiTietDonHang (1-N)
MonAn.hasMany(ChiTietDonHang, { foreignKey: "MaMon", as: "chiTietDonHang" });
ChiTietDonHang.belongsTo(MonAn, { foreignKey: "MaMon", as: "monAn" });

// Ban - DatBan (1-N)
Ban.hasMany(DatBan, { foreignKey: "MaBan", as: "datBans" });
DatBan.belongsTo(Ban, { foreignKey: "MaBan", as: "ban" });

// KhachHang - DatBan (1-N)
KhachHang.hasMany(DatBan, { foreignKey: "MaKH", as: "datBans" });
DatBan.belongsTo(KhachHang, { foreignKey: "MaKH", as: "khachHang" });

// DatBan - DatBanMonAn (1-N)
DatBan.hasMany(DatBanMonAn, { foreignKey: "MaDatBan", as: "datBanMonAn" });
DatBanMonAn.belongsTo(DatBan, { foreignKey: "MaDatBan", as: "datBan" });

// MonAn - DatBanMonAn (1-N)
MonAn.hasMany(DatBanMonAn, { foreignKey: "MaMon", as: "datBanMonAn" });
DatBanMonAn.belongsTo(MonAn, { foreignKey: "MaMon", as: "monAn" });

// NhaCungCap - NguyenVatLieu (1-N)
NhaCungCap.hasMany(NguyenVatLieu, {
  foreignKey: "MaNhaCungCap",
  as: "nguyenVatLieus",
});
NguyenVatLieu.belongsTo(NhaCungCap, {
  foreignKey: "MaNhaCungCap",
  as: "nhaCungCap",
});

// PhongBan - NhanVien (1-N)
PhongBan.hasMany(NhanVien, { foreignKey: "MaPhongBan", as: "nhanViens" });
NhanVien.belongsTo(PhongBan, { foreignKey: "MaPhongBan", as: "phongBan" });

// NhanVien - TaiKhoan (1-1)
NhanVien.hasOne(TaiKhoan, { foreignKey: "MaNhanVien", as: "taiKhoan" });
TaiKhoan.belongsTo(NhanVien, { foreignKey: "MaNhanVien", as: "nhanVien" });

// NhanVien - LichLamViec (1-N)
NhanVien.hasMany(LichLamViec, { foreignKey: "MaNhanVien", as: "lichLamViecs" });
LichLamViec.belongsTo(NhanVien, { foreignKey: "MaNhanVien", as: "nhanVien" });

// CaLamViec - LichLamViec (1-N)
CaLamViec.hasMany(LichLamViec, { foreignKey: "MaCa", as: "lichLamViecs" });
LichLamViec.belongsTo(CaLamViec, { foreignKey: "MaCa", as: "caLamViec" });

// KhuyenMai - MonAn (1-N)
KhuyenMai.hasMany(MonAn, { foreignKey: "MaKM", as: "monAns" });
MonAn.belongsTo(KhuyenMai, { foreignKey: "MaKM", as: "khuyenMai" });

// ✅ COMMENT: TaiKhoan và KhachHang không có FK trực tiếp
// Chúng được link thông qua Email/SDT
// Để truy vấn, sử dụng findOne với điều kiện OR trong controller

// ✅ Nếu muốn thêm FK trong tương lai:
// 1. Thêm cột MaTaiKhoan vào bảng KhachHang (migration)
// 2. Uncomment code bên dưới:

/*
TaiKhoan.hasOne(KhachHang, {
  foreignKey: "MaTaiKhoan",
  as: "khachHang",
  constraints: false, // Vì không có FK trong DB hiện tại
});

KhachHang.belongsTo(TaiKhoan, {
  foreignKey: "MaTaiKhoan",
  as: "taiKhoan",
  constraints: false,
});
*/

// ✅ NEW: Thiết lập mối quan hệ DatBan <-> DonHang (1-1)
DatBan.hasOne(DonHang, {
  foreignKey: "MaDatBan",
  as: "donHang",
  onDelete: "SET NULL",
});

DonHang.belongsTo(DatBan, {
  foreignKey: "MaDatBan",
  as: "datBan",
});

module.exports = {
  sequelize,
  VaiTro,
  TaiKhoan,
  LoaiMon,
  MonAn,
  KhachHang, // ✅ Đảm bảo export
  Ban,
  DonHang,
  ChiTietDonHang,
  DatBan,
  DatBanMonAn,
  NhaCungCap,
  NguyenVatLieu,
  PhongBan,
  NhanVien,
  CaLamViec,
  LichLamViec,
  KhuyenMai,
};
