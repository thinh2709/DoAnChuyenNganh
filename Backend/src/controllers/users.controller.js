/**
 * Controller xử lý API cho Users (TaiKhoan)
 * CRUD + Login/Register
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { TaiKhoan, VaiTro, KhachHang } = require("../models");
const { sequelize } = require("../config/database");
const config = require("../config/env");
const logger = require("../utils/logger");

/**
 * Tạo JWT token
 */
const generateToken = (taiKhoan) => {
  return jwt.sign(
    {
      id: taiKhoan.MaTaiKhoan,
      tenDangNhap: taiKhoan.TenDangNhap,
      email: taiKhoan.Email,
      role: taiKhoan.vaiTro?.TenVaiTro || "NhanVien",
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * Lấy tất cả users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await TaiKhoan.findAll({
      include: [
        {
          model: VaiTro,
          as: "vaiTro",
          attributes: ["MaVaiTro", "TenVaiTro", "MoTa"],
        },
      ],
      attributes: {
        exclude: ["MatKhauHash"],
      },
    });

    return res.json({
      success: true,
      message: "Lấy danh sách users thành công",
      data: users,
    });
  } catch (error) {
    logger.error("Lỗi lấy danh sách users", { error: error.message });
    next(error);
  }
};

/**
 * Lấy user theo ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await TaiKhoan.findByPk(id, {
      include: [
        {
          model: VaiTro,
          as: "vaiTro",
          attributes: ["MaVaiTro", "TenVaiTro", "MoTa"],
        },
      ],
      attributes: {
        exclude: ["MatKhauHash"],
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    return res.json({
      success: true,
      message: "Lấy thông tin user thành công",
      data: user,
    });
  } catch (error) {
    logger.error("Lỗi lấy user", { error: error.message });
    next(error);
  }
};

/**
 * Đăng ký user mới
 */
const register = async (req, res, next) => {
  try {
    const { HoTen, TenDangNhap, Email, SDT, MatKhau, MaVaiTro, DiaChi } = req.body;

    // Validation
    if (!HoTen || !TenDangNhap || !Email || !SDT || !MatKhau) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    if (MatKhau.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    // Kiểm tra tên đăng nhập đã tồn tại
    const existingUser = await TaiKhoan.findOne({
      where: { TenDangNhap },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Tên đăng nhập đã tồn tại",
      });
    }

    // Kiểm tra email đã tồn tại
    const existingEmail = await TaiKhoan.findOne({
      where: { Email },
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    // ✅ NEW: Kiểm tra SDT đã tồn tại trong KhachHang
    const existingPhone = await KhachHang.findOne({
      where: { SoDienThoai: SDT },
    });

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: "Số điện thoại đã được sử dụng",
      });
    }

    // Hash password
    const MatKhauHash = await bcrypt.hash(MatKhau, 10);

    const transaction = await sequelize.transaction();

    try {
      // Tạo user mới
      const newUser = await TaiKhoan.create(
        {
          HoTen,
          TenDangNhap,
          Email,
          SDT,
          MatKhauHash,
          MaVaiTro: MaVaiTro || 3, // ✅ FIXED: MaVaiTro = 3 (KhachHang)
          TrangThai: "Active",
          NgayThamGia: new Date(),
        },
        { transaction }
      );

      // ✅ FIXED: Tạo KhachHang với DiaChi
      const newCustomer = await KhachHang.create(
        {
          HoTen,
          SoDienThoai: SDT,
          Email,
          DiaChi: DiaChi || "", // ✅ Lưu địa chỉ
        },
        { transaction }
      );

      await transaction.commit();

      // Lấy user với thông tin đầy đủ
      const user = await TaiKhoan.findByPk(newUser.MaTaiKhoan, {
        include: [
          {
            model: VaiTro,
            as: "vaiTro",
          },
        ],
        attributes: {
          exclude: ["MatKhauHash"],
        },
      });

      const userData = user.toJSON();
      userData.MaKhachHang = newCustomer.MaKhachHang;
      userData.DiaChi = newCustomer.DiaChi; // ✅ Trả về địa chỉ

      logger.info("User đăng ký thành công", {
        userId: user.MaTaiKhoan,
        tenDangNhap: user.TenDangNhap,
        maKhachHang: newCustomer.MaKhachHang,
      });

      return res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        data: userData,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error("Lỗi đăng ký user", { error: error.message });
    next(error);
  }
};

/**
 * Đăng nhập
 */
const login = async (req, res, next) => {
  try {
    const { TenDangNhap, MatKhau } = req.body;

    // Validation
    if (!TenDangNhap || !MatKhau) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email/tên đăng nhập và mật khẩu",
      });
    }

    // ✅ FIXED: Tìm user theo TenDangNhap HOẶC Email
    const user = await TaiKhoan.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { TenDangNhap: TenDangNhap },
          { Email: TenDangNhap }
        ]
      },
      include: [
        {
          model: VaiTro,
          as: "vaiTro",
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email/Tên đăng nhập hoặc mật khẩu không đúng",
      });
    }

    // ✅ Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(MatKhau, user.MatKhauHash);

    if (!isPasswordValid) {
      user.LoginAttempts += 1;
      if (user.LoginAttempts >= 5) {
        user.TrangThai = "Locked";
        user.LockoutEnd = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();

      return res.status(401).json({
        success: false,
        message: "Email/Tên đăng nhập hoặc mật khẩu không đúng",
      });
    }

    // Kiểm tra trạng thái tài khoản
    if (user.TrangThai === "Locked") {
      if (user.LockoutEnd && new Date(user.LockoutEnd) > new Date()) {
        const minutesLeft = Math.ceil(
          (new Date(user.LockoutEnd) - new Date()) / 60000
        );
        return res.status(403).json({
          success: false,
          message: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${minutesLeft} phút`,
        });
      }
      user.TrangThai = "Active";
      user.LoginAttempts = 0;
      user.LockoutEnd = null;
    }

    if (user.TrangThai !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa",
      });
    }

    // Cập nhật thông tin đăng nhập
    user.LastLogin = new Date();
    user.LoginAttempts = 0;
    await user.save();

    // ✅ NEW: Tìm KhachHang theo Email hoặc SDT
    const khachHang = await KhachHang.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { Email: user.Email },
          { SoDienThoai: user.SDT }
        ]
      }
    });

    // Tạo token
    const token = generateToken(user);

    // ✅ FIXED: Trả về thông tin user với DiaChi từ KhachHang
    const userData = {
      MaTaiKhoan: user.MaTaiKhoan,
      HoTen: user.HoTen,
      TenDangNhap: user.TenDangNhap,
      Email: user.Email,
      SDT: user.SDT,
      TrangThai: user.TrangThai,
      NgayThamGia: user.NgayThamGia,
      TenVaiTro: user.vaiTro?.TenVaiTro || "NhanVien",
      // ✅ NEW: Thêm thông tin từ KhachHang
      MaKhachHang: khachHang?.MaKhachHang || null,
      DiaChi: khachHang?.DiaChi || "", // ✅ Frontend cần field này
    };

    logger.info("User đăng nhập thành công", {
      userId: user.MaTaiKhoan,
      tenDangNhap: user.TenDangNhap,
      maKhachHang: khachHang?.MaKhachHang || null,
    });

    return res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: userData,
      },
    });
  } catch (error) {
    logger.error("Lỗi đăng nhập", { error: error.message });
    next(error);
  }
};

/**
 * Cập nhật user
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { HoTen, Email, SDT, MaVaiTro, TrangThai } = req.body;

    const user = await TaiKhoan.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    // Cập nhật thông tin
    if (HoTen) user.HoTen = HoTen;
    if (Email) user.Email = Email;
    if (SDT) user.SDT = SDT;
    if (MaVaiTro) user.MaVaiTro = MaVaiTro;
    if (TrangThai) user.TrangThai = TrangThai;

    await user.save();

    // Lấy user với thông tin đầy đủ
    const updatedUser = await TaiKhoan.findByPk(id, {
      include: [
        {
          model: VaiTro,
          as: "vaiTro",
        },
      ],
      attributes: {
        exclude: ["MatKhauHash"],
      },
    });

    return res.json({
      success: true,
      message: "Cập nhật user thành công",
      data: updatedUser,
    });
  } catch (error) {
    logger.error("Lỗi cập nhật user", { error: error.message });
    next(error);
  }
};

/**
 * Xóa user
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await TaiKhoan.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    await user.destroy();

    return res.json({
      success: true,
      message: "Xóa user thành công",
    });
  } catch (error) {
    logger.error("Lỗi xóa user", { error: error.message });
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  register,
  login,
  updateUser,
  deleteUser,
};
