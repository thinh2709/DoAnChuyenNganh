/**
 * Controller xử lý API cho Orders (DonHang)
 * CRUD đơn hàng
 */

const { DonHang, ChiTietDonHang, MonAn, KhachHang, DatBan, Ban } = require("../models");
const { sequelize } = require("../config/database"); // ✅ Added sequelize import
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const { sendOrderEmail, sendPaymentSuccessEmail } = require("../utils/sendMail");

/**
 * Lấy tất cả đơn hàng (bao gồm cả từ Đặt bàn)
 */
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await DonHang.findAll({
      include: [
        {
          model: KhachHang,
          as: "khachHang",
          attributes: ["MaKhachHang", "HoTen", "SoDienThoai", "Email"],
        },
        {
          model: ChiTietDonHang,
          as: "chiTietDonHang",
          include: [
            {
              model: MonAn,
              as: "monAn",
              attributes: ["MaMon", "TenMon", "HinhAnh"],
            },
          ],
        },
        {
          model: DatBan,
          as: "datBan",
          required: false,
          include: [
            {
              model: Ban,
              as: "ban",
              attributes: ["MaBan", "TenBan", "SucChua"],
            },
          ],
        },
      ],
      order: [["NgayDat", "DESC"]],
    });

    const formattedOrders = orders.map((order) => ({
      ...order.toJSON(),
      TongTien: parseFloat(order.TongTien || 0),
      chiTietDonHang: (order.chiTietDonHang || []).map((detail) => ({
        ...detail.toJSON(),
        DonGia: parseFloat(detail.DonGia || 0),
        ThanhTien: parseFloat(detail.ThanhTien || 0),
        SoLuong: parseInt(detail.SoLuong || 0),
      })),
      loaiDon: order.LoaiDon || 'GiaoDi',
      isFromReservation: !!order.MaDatBan,
      tenBan: order.datBan?.ban?.TenBan || null,
      maBan: order.datBan?.ban?.MaBan || null,
    }));

    return res.json({
      success: true,
      message: "Lấy danh sách đơn hàng thành công",
      data: formattedOrders,
    });
  } catch (error) {
    logger.error("Lỗi lấy danh sách đơn hàng", { error: error.message });
    next(error);
  }
};

/**
 * Lấy đơn hàng theo ID (UPDATED với ownership check)
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ CRITICAL: Lấy userId từ JWT token
    const userId = req.user?.id || req.user?.MaTaiKhoan;
    const userRole = req.user?.role || req.user?.TenVaiTro;

    console.log("🔍 getOrderById - Debug Info:", {
      orderId: id,
      userId,
      userRole,
      userFromToken: req.user,
    });

    const order = await DonHang.findByPk(id, {
      include: [
        {
          model: KhachHang,
          as: "khachHang",
        },
        {
          model: ChiTietDonHang,
          as: "chiTietDonHang",
          include: [
            {
              model: MonAn,
              as: "monAn",
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // ✅ CRITICAL: Ownership Check
    // Nếu user là Admin/Employee -> Cho phép xem mọi đơn
    const isAdminOrEmployee = ["Admin", "QuanLy", "NhanVien"].includes(userRole);

    if (!isAdminOrEmployee) {
      // ✅ User thường -> Chỉ được xem đơn của mình
      const { TaiKhoan } = require("../models");
      const taiKhoan = await TaiKhoan.findByPk(userId);

      if (!taiKhoan) {
        return res.status(401).json({
          success: false,
          message: "Không tìm thấy thông tin tài khoản",
        });
      }

      // Tìm khách hàng liên kết với tài khoản này
      const khachHang = await KhachHang.findOne({
        where: {
          [Op.or]: [
            { Email: taiKhoan.Email },
            { SoDienThoai: taiKhoan.SDT },
          ],
        },
      });

      // ✅ Debug logs để kiểm tra
      console.log("👤 Ownership Check:", {
        orderKhachHangID: order.KhachHangID,
        userKhachHangID: khachHang?.MaKhachHang,
        orderKhachHangIDType: typeof order.KhachHangID,
        userKhachHangIDType: typeof khachHang?.MaKhachHang,
        isMatch: String(order.KhachHangID) === String(khachHang?.MaKhachHang),
      });

      // ✅ So sánh ID (chuyển về String để tránh lỗi type mismatch)
      if (
        !khachHang ||
        String(order.KhachHangID) !== String(khachHang.MaKhachHang)
      ) {
        logger.warn("Unauthorized access attempt", {
          userId,
          orderId: id,
          orderKhachHangID: order.KhachHangID,
          userKhachHangID: khachHang?.MaKhachHang,
        });

        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập đơn hàng này",
        });
      }
    }

    // ✅ Allowed: Return order data
    logger.info("User accessed order successfully", {
      userId,
      orderId: id,
      userRole,
    });

    return res.json({
      success: true,
      message: "Lấy thông tin đơn hàng thành công",
      data: order,
    });
  } catch (error) {
    logger.error("Lỗi lấy đơn hàng", { error: error.message });
    next(error);
  }
};

/**
 * Tạo đơn hàng mới (Cập nhật: LoaiDon = GiaoDi cho đơn Online)
 */
const createOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { ChiTietList, shippingInfo, paymentMethod, PromotionId, DiscountAmount } = req.body; // ✅ NEW: Nhận promotion

    const userId = req.user?.id || req.user?.MaTaiKhoan;

    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để đặt hàng",
      });
    }

    if (!ChiTietList || !Array.isArray(ChiTietList) || ChiTietList.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống. Vui lòng thêm món ăn trước khi đặt hàng",
      });
    }

    const { TaiKhoan } = require("../models");
    const user = await TaiKhoan.findByPk(userId, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    let khachHang = await KhachHang.findOne({
      where: {
        [Op.or]: [{ SoDienThoai: user.SDT }, { Email: user.Email }],
      },
      transaction,
    });

    if (!khachHang) {
      khachHang = await KhachHang.create(
        {
          HoTen: user.HoTen,
          SoDienThoai: user.SDT,
          Email: user.Email,
          DiaChi: shippingInfo?.DiaChi || shippingInfo?.address || "",
        },
        { transaction }
      );

      logger.info("Tạo khách hàng từ user", {
        userId,
        maKhachHang: khachHang.MaKhachHang,
      });
    } else {
      if (shippingInfo?.DiaChi || shippingInfo?.address) {
        khachHang.DiaChi = shippingInfo.DiaChi || shippingInfo.address;
        await khachHang.save({ transaction });
      }
    }

    // ✅ NEW: Lưu paymentMethod và set trạng thái tùy theo phương thức
    const trangThai = 'ChoXacNhan';

    const newOrder = await DonHang.create(
      {
        KhachHangID: khachHang.MaKhachHang,
        MaDatBan: null,
        LoaiDon: 'GiaoDi',
        NgayDat: new Date(),
        TrangThai: trangThai, // ✅ NEW: Khác nhau theo paymentMethod
        TongTien: 0,
        DiaChiGiaoHang:
          shippingInfo?.DiaChi ||
          shippingInfo?.address ||
          khachHang.DiaChi ||
          "",
        PaymentMethod: paymentMethod || 'cod', // ✅ NEW: Lưu phương thức thanh toán
      },
      { transaction }
    );

    let tongTien = 0;
    const chiTietList = [];

    // ✅ FIX: Race condition khi tạo đơn hàng
    for (const item of ChiTietList) {
      const monAn = await MonAn.findByPk(item.MaMon, {
        transaction,
        lock: transaction.LOCK.UPDATE // ✅ Pessimistic lock
      });

      if (!monAn) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy món ăn với mã ${item.MaMon}`,
        });
      }

      // ✅ FIX: Kiểm tra trạng thái món ăn
      if (monAn.TrangThai === 'NgungKinhDoanh') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Món "${monAn.TenMon}" hiện không phục vụ`,
        });
      }

      const donGia = Number(monAn.Gia) || 0; // ✅ FIX
      const soLuong = Number(item.SoLuong) || 0; // ✅ FIX
      const thanhTien = donGia * soLuong;

      const chiTiet = await ChiTietDonHang.create(
        {
          MaDonHang: newOrder.MaDonHang,
          MaMon: item.MaMon,
          SoLuong: soLuong,
          DonGia: donGia,
          ThanhTien: thanhTien,
        },
        { transaction }
      );

      tongTien += thanhTien; // ✅ Cộng số

      // Ghi log thông tin chi tiết đơn hàng
      logger.info("Thêm món vào đơn hàng", {
        maDonHang: newOrder.MaDonHang,
        maMon: item.MaMon,
        soLuong,
        donGia,
        thanhTien,
      });

      chiTietList.push(chiTiet);
    }

    // ✅ NEW: Áp dụng khuyến mãi nếu có
    if (PromotionId && DiscountAmount) {
      newOrder.MaKM = PromotionId;
      const discount = Number(DiscountAmount) || 0;
      tongTien = Math.max(0, tongTien - discount);

      logger.info('Áp dụng khuyến mãi khi tạo đơn hàng', {
        maDonHang: newOrder.MaDonHang,
        promotionId: PromotionId,
        discountAmount: discount,
        originalAmount: tongTien + discount,
        finalAmount: tongTien,
      });
    }

    // Update order total
    newOrder.TongTien = Number(tongTien); // ✅ Ép kiểu cuối cùng
    await newOrder.save({ transaction });

    await transaction.commit();

    // ✅ Lấy đơn hàng với thông tin đầy đủ
    const order = await DonHang.findByPk(newOrder.MaDonHang, {
      include: [
        {
          model: KhachHang,
          as: "khachHang",
        },
        {
          model: ChiTietDonHang,
          as: "chiTietDonHang",
          include: [
            {
              model: MonAn,
              as: "monAn",
            },
          ],
        },
      ],
    });

    // ✅ Gửi email xác nhận NGAY sau khi lưu thành công
    if (khachHang.Email) {
      sendOrderEmail(order, khachHang, order.chiTietDonHang).catch((err) => {
        logger.error("Lỗi gửi email xác nhận đơn hàng", { error: err.message });
      });
    }

    logger.info("Tạo đơn hàng GIAO ĐI thành công", {
      maDonHang: order.MaDonHang,
      loaiDon: 'GiaoDi',
      paymentMethod: paymentMethod || 'cod',
      userId,
      maKhachHang: khachHang.MaKhachHang,
      tongTien,
    });

    return res.status(201).json({
      success: true,
      message: `Đặt hàng thành công! ${khachHang.Email
        ? "Vui lòng kiểm tra email để xem chi tiết đơn hàng."
        : ""
        }`,
      data: order,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error("Lỗi tạo đơn hàng", { error: error.message });
    next(error);
  }
};

/**
 * Cập nhật trạng thái đơn hàng (UPDATED với giải phóng bàn)
 */
const updateOrderStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { TrangThai, PromotionId, DiscountAmount, PaymentMethod, PaymentNote } = req.body;

    const validStatuses = [
      'ChoXacNhan',
      'DangChuanBi',
      'HoanThanh',
      'DaThanhToan',
      'DaHuy'
    ];

    if (!validStatuses.includes(TrangThai)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: ChoXacNhan, DangChuanBi, HoanThanh, DaThanhToan, DaHuy',
      });
    }

    const order = await DonHang.findByPk(id, {
      include: [
        {
          model: DatBan,
          as: 'datBan',
          include: [
            {
              model: Ban,
              as: 'ban'
            }
          ]
        }
      ],
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    const currentStatus = order.TrangThai;

    if (currentStatus === 'DaThanhToan' || currentStatus === 'DaHuy') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Không thể thay đổi trạng thái từ ${currentStatus}`,
      });
    }

    // Validate status transition flow
    const statusFlow = {
      'ChoXacNhan': ['DangChuanBi', 'DaHuy'],
      'DangChuanBi': ['HoanThanh', 'DaHuy'],
      'HoanThanh': ['DaThanhToan'],
    };

    if (statusFlow[currentStatus] && !statusFlow[currentStatus].includes(TrangThai)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ "${currentStatus}" sang "${TrangThai}". Flow hợp lệ: ${statusFlow[currentStatus].join(', ')}`,
      });
    }

    order.TrangThai = TrangThai;

    // ✅ Xử lý thanh toán
    if (TrangThai === 'DaThanhToan') {
      // Lưu thông tin khuyến mãi
      if (PromotionId) {
        order.MaKM = PromotionId;
      }

      // Áp dụng giảm giá
      if (DiscountAmount) {
        const originalAmount = parseFloat(order.TongTien);
        const discount = parseFloat(DiscountAmount);
        order.TongTien = originalAmount - discount;

        logger.info('Áp dụng khuyến mãi khi thanh toán', {
          maDonHang: id,
          promotionId: PromotionId,
          originalAmount,
          discountAmount: discount,
          finalAmount: order.TongTien,
        });
      }

      // Lưu thông tin thanh toán
      if (PaymentMethod) {
        order.PaymentMethod = PaymentMethod;
      }
      if (PaymentNote) {
        order.PaymentNote = PaymentNote;
      }

      // ✅ CRITICAL: Giải phóng bàn nếu đơn hàng có liên kết với đặt bàn
      if (order.MaDatBan) {
        const datBan = await DatBan.findByPk(order.MaDatBan, { transaction });

        if (datBan && datBan.MaBan) {
          const ban = await Ban.findByPk(datBan.MaBan, { transaction });

          if (ban) {
            // Cập nhật trạng thái bàn về TRONG (available)
            ban.TrangThai = 'TRONG';
            ban.SoLuongDatCho = Math.max(0, (ban.SoLuongDatCho || 1) - 1);
            await ban.save({ transaction });

            logger.info('Giải phóng bàn sau thanh toán', {
              maDonHang: id,
              maBan: ban.MaBan,
              tenBan: ban.TenBan,
              trangThaiMoi: 'TRONG'
            });
          }

          // Cập nhật trạng thái đặt bàn
          datBan.TrangThai = 'DaHoanThanh';
          await datBan.save({ transaction });
        }
      }
    }

    await order.save({ transaction });

    logger.info('Cập nhật trạng thái đơn hàng', {
      maDonHang: id,
      oldStatus: currentStatus,
      newStatus: TrangThai,
      hasTableRelease: TrangThai === 'DaThanhToan' && !!order.MaDatBan
    });

    // Gửi email hóa đơn khi thanh toán thành công
    if (TrangThai === 'DaThanhToan') {
      const fullOrder = await DonHang.findByPk(id, {
        include: [
          {
            model: KhachHang,
            as: 'khachHang',
          },
          {
            model: ChiTietDonHang,
            as: 'chiTietDonHang',
            include: [
              {
                model: MonAn,
                as: 'monAn',
              },
            ],
          },
        ],
        transaction
      });

      if (fullOrder && fullOrder.khachHang && fullOrder.khachHang.Email) {
        sendPaymentSuccessEmail(
          fullOrder,
          fullOrder.khachHang,
          fullOrder.chiTietDonHang
        ).catch((err) => {
          logger.error('Lỗi gửi email hóa đơn thanh toán', {
            error: err.message,
            maDonHang: id,
          });
        });
      }
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: `Cập nhật trạng thái đơn hàng thành công${TrangThai === 'DaThanhToan' && order.MaDatBan ? '. Bàn đã được giải phóng.' : ''}`,
      data: order,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Lỗi cập nhật trạng thái đơn hàng', { error: error.message });
    next(error);
  }
};

/**
 * Lấy số lượng đơn hàng hôm nay
 */
const getTodayOrderCount = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await DonHang.count({
      where: {
        NgayDat: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      },
    });

    return res.json({
      success: true,
      message: "Lấy số lượng đơn hàng hôm nay thành công",
      data: { count },
    });
  } catch (error) {
    logger.error("Lỗi đếm đơn hàng hôm nay", { error: error.message });
    next(error);
  }
};

/**
 * Lấy doanh thu hôm nay
 */
const getTodayRevenue = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await DonHang.findAll({
      where: {
        NgayDat: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
        TrangThai: {
          [Op.ne]: "DaHuy",
        },
      },
      attributes: ["TongTien"],
    });

    const revenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.TongTien || 0);
    }, 0);

    return res.json({
      success: true,
      message: "Lấy doanh thu hôm nay thành công",
      data: { revenue },
    });
  } catch (error) {
    logger.error("Lỗi lấy doanh thu hôm nay", { error: error.message });
    next(error);
  }
};

/**
 * Xóa đơn hàng
 */
const deleteOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const order = await DonHang.findByPk(id, {
      include: [
        {
          model: ChiTietDonHang,
          as: "chiTietDonHang",
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Xóa chi tiết đơn hàng
    await ChiTietDonHang.destroy({
      where: { MaDonHang: id },
      transaction,
    });

    // Xóa đơn hàng
    await order.destroy({ transaction });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Xóa đơn hàng thành công",
    });
  } catch (error) {
    await transaction.rollback();
    logger.error("Lỗi xóa đơn hàng", { error: error.message });
    next(error);
  }
};

/**
 * Lấy đơn hàng gần đây (cho Dashboard)
 */
const getRecentOrders = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    const orders = await DonHang.findAll({
      include: [
        {
          model: KhachHang,
          as: "khachHang",
          attributes: ["MaKhachHang", "HoTen", "SoDienThoai", "Email"],
        },
      ],
      order: [["NgayDat", "DESC"]],
      limit: parseInt(limit),
      attributes: ["MaDonHang", "NgayDat", "TongTien", "TrangThai"],
    });

    logger.info(`Lấy ${orders.length} đơn hàng gần đây thành công`);

    return res.json({
      success: true,
      message: "Lấy đơn hàng gần đây thành công",
      data: orders,
    });
  } catch (error) {
    logger.error("Lỗi lấy đơn hàng gần đây", {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Thêm món vào đơn hàng đang phục vụ (UPDATED)
 */
const addItemsToOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một món để thêm',
      });
    }

    const order = await DonHang.findByPk(id, { transaction });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    // ✅ UPDATED: Cho phép thêm món ở các trạng thái hợp lệ
    const allowedStatuses = ['ChoXacNhan', 'DangChuanBi', 'HoanThanh'];
    if (!allowedStatuses.includes(order.TrangThai)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Không thể thêm món vào đơn hàng có trạng thái "${order.TrangThai}". Chỉ có thể thêm món khi đơn đang "Chờ xác nhận", "Đang chuẩn bị" hoặc "Hoàn thành".`,
      });
    }

    let tongTienThem = 0;
    const chiTietMoi = [];

    for (const item of items) {
      // Lấy giá từ DB (không tin client)
      const monAn = await MonAn.findByPk(item.MaMon, { transaction });

      if (!monAn) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy món ăn với mã ${item.MaMon}`,
        });
      }

      const donGia = parseFloat(monAn.Gia) || 0;
      const soLuong = parseInt(item.SoLuong) || 0;
      const thanhTien = donGia * soLuong;

      // Kiểm tra món đã có trong đơn chưa
      const existingItem = await ChiTietDonHang.findOne({
        where: {
          MaDonHang: id,
          MaMon: item.MaMon,
        },
        transaction,
      });

      if (existingItem) {
        // ✅ Nếu món đã có -> Cộng dồn số lượng
        existingItem.SoLuong = parseInt(existingItem.SoLuong) + soLuong;
        existingItem.ThanhTien = parseFloat(existingItem.DonGia) * existingItem.SoLuong;
        await existingItem.save({ transaction });

        chiTietMoi.push(existingItem);
        tongTienThem += thanhTien;

        logger.info('Cộng dồn món đã có', {
          maDonHang: id,
          maMon: item.MaMon,
          soLuongCu: parseInt(existingItem.SoLuong) - soLuong,
          soLuongMoi: existingItem.SoLuong,
        });
      } else {
        // ✅ Nếu món chưa có -> Tạo mới
        const newChiTiet = await ChiTietDonHang.create(
          {
            MaDonHang: id,
            MaMon: item.MaMon,
            SoLuong: soLuong,
            DonGia: donGia,
            ThanhTien: thanhTien,
          },
          { transaction }
        );

        chiTietMoi.push(newChiTiet);
        tongTienThem += thanhTien;
      }
    }

    // ✅ Cập nhật tổng tiền đơn hàng (cộng dồn)
    order.TongTien = Number(order.TongTien || 0) + Number(tongTienThem); // ✅ FIX
    await order.save({ transaction });

    await transaction.commit();

    // Lấy đơn hàng với thông tin đầy đủ
    const updatedOrder = await DonHang.findByPk(id, {
      include: [
        {
          model: KhachHang,
          as: 'khachHang',
        },
        {
          model: ChiTietDonHang,
          as: 'chiTietDonHang',
          include: [
            {
              model: MonAn,
              as: 'monAn',
            },
          ],
        },
      ],
    });

    logger.info('Thêm món vào đơn hàng thành công', {
      maDonHang: id,
      soMonThem: items.length,
      tongTienThem,
      tongTienMoi: order.TongTien,
    });

    return res.status(200).json({
      success: true,
      message: `Đã thêm ${items.length} món vào đơn hàng. Tổng tiền cộng thêm: ${tongTienThem.toLocaleString('vi-VN')} VNĐ`,
      data: {
        order: updatedOrder,
        addedItems: chiTietMoi,
        totalAdded: tongTienThem,
      },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Lỗi thêm món vào đơn hàng', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Lấy danh sách đơn hàng của user hiện tại
 */
const getMyOrders = async (req, res, next) => {
  try {
    // ✅ Lấy userId từ JWT token (middleware authenticate đã gán vào req.user)
    const userId = req.user?.id || req.user?.MaTaiKhoan;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập",
      });
    }

    // Tìm tài khoản
    const { TaiKhoan } = require("../models");
    const taiKhoan = await TaiKhoan.findByPk(userId);

    if (!taiKhoan) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    // Tìm khách hàng theo email hoặc SĐT
    const khachHang = await KhachHang.findOne({
      where: {
        [Op.or]: [
          { Email: taiKhoan.Email },
          { SoDienThoai: taiKhoan.SDT }
        ]
      }
    });

    if (!khachHang) {
      return res.json({
        success: true,
        message: "Chưa có đơn hàng nào",
        data: [],
      });
    }

    // Lấy đơn hàng của khách hàng
    const orders = await DonHang.findAll({
      where: { KhachHangID: khachHang.MaKhachHang },
      include: [
        {
          model: ChiTietDonHang,
          as: "chiTietDonHang",
          include: [
            {
              model: MonAn,
              as: "monAn",
              attributes: ["MaMon", "TenMon", "HinhAnh", "Gia"],
            },
          ],
        },
      ],
      order: [["NgayDat", "DESC"]],
    });

    return res.json({
      success: true,
      message: "Lấy lịch sử đơn hàng thành công",
      data: orders,
    });
  } catch (error) {
    logger.error("Lỗi lấy lịch sử đơn hàng", { error: error.message });
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getTodayOrderCount,
  getTodayRevenue,
  deleteOrder,
  getRecentOrders,
  addItemsToOrder, // ✅ NEW
  getMyOrders, // ✅ NEW
};
