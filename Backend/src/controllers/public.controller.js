/**
 * Controller xử lý API công khai (không cần authentication)
 * Dành cho khách vãng lai đặt bàn
 */

const { DatBan, KhachHang, Ban, MonAn, DatBanMonAn, DonHang, ChiTietDonHang } = require("../models"); // ✅ Thêm DonHang, ChiTietDonHang
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const { sendReservationEmail } = require("../utils/sendMail");

const findAvailableTable = async (
  soNguoi,
  thoiGianBatDau,
  thoiGianKetThuc,
  transaction
) => {
  const candidateTables = await Ban.findAll({
    where: {
      SucChua: {
        [Op.gte]: soNguoi,
      },
    },
    order: [["SucChua", "ASC"]],
    transaction,
  });

  if (!candidateTables || candidateTables.length === 0) {
    return null;
  }

  for (const table of candidateTables) {
    const conflictingReservation = await DatBan.findOne({
      where: {
        MaBan: table.MaBan,
        [Op.and]: [
          {
            ThoiGianBatDau: {
              [Op.lt]: thoiGianKetThuc,
            },
          },
          {
            ThoiGianKetThuc: {
              [Op.gt]: thoiGianBatDau,
            },
          },
        ],
      },
      transaction,
    });

    if (!conflictingReservation) {
      return table;
    }
  }


  return null;
};

module.exports = {
  createPublicReservation: async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
      const {
        HoTen,
        SoDienThoai,
        Email,
        ThoiGianBatDau,
        SoNguoi,
        GhiChu,
        cartItems,
      } = req.body;

      if (!HoTen || !SoDienThoai || !ThoiGianBatDau || !SoNguoi) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Vui lòng điền đầy đủ thông tin: Họ tên, Số điện thoại, Thời gian và Số người",
        });
      }

      const cleanedHoTen = HoTen.trim();
      const cleanedSDT = SoDienThoai.trim();
      const cleanedEmail = Email ? Email.trim() : null;
      if (!cleanedHoTen) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Họ tên không được để trống",
        });
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(cleanedSDT)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Số điện thoại không hợp lệ (phải là 10 chữ số)",
        });
      }

      if (cleanedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanedEmail)) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Email không hợp lệ",
          });
        }
      }


      const soNguoiInt = parseInt(SoNguoi);
      if (isNaN(soNguoiInt) || soNguoiInt < 1 || soNguoiInt > 20) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Số người phải từ 1 đến 20",
        });
      }


      const now = new Date(); // ✅ Define now
      const thoiGianBatDau = new Date(ThoiGianBatDau); // ✅ Parse datetime string
      const minBookingTime = new Date(now.getTime() + 30 * 60 * 1000);

      // 1. Check quá khứ & tối thiểu 30p
      if (thoiGianBatDau <= minBookingTime) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Thời gian đặt bàn phải ít nhất 30 phút sau thời điểm hiện tại",
        });
      }

      // 2. Check quá 3 ngày
      const maxDate = new Date();
      maxDate.setDate(now.getDate() + 3);
      if (thoiGianBatDau > maxDate) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Chỉ được đặt bàn trước tối đa 3 ngày" });
      }

      // 3. Check giờ mở/đóng cửa
      const hour = thoiGianBatDau.getHours();
      const minute = thoiGianBatDau.getMinutes();

      if (hour < 8) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Nhà hàng mở cửa từ 08:00" });
      }

      // Đóng cửa 23:00 -> Last order 21:00
      if (hour > 21 || (hour === 21 && minute > 0)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Vui lòng đặt bàn trước 21:00" });
      }


      // (Đã xóa check 30 ngày vì đã có check 3 ngày ở trên)
      const thoiGianKetThuc = new Date(
        thoiGianBatDau.getTime() + 2 * 60 * 60 * 1000
      );

      let customer = await KhachHang.findOne({
        where: { SoDienThoai: cleanedSDT },
        transaction,
      });

      if (customer) {
        customer.HoTen = cleanedHoTen;
        if (cleanedEmail) customer.Email = cleanedEmail;
        await customer.save({ transaction });

        logger.info("Cập nhật thông tin khách hàng", {
          maKhachHang: customer.MaKhachHang,
          soDienThoai: cleanedSDT,
        });
      } else {
        customer = await KhachHang.create(
          {
            HoTen: cleanedHoTen,
            SoDienThoai: cleanedSDT,
            Email: cleanedEmail,
            DiaChi: "",
          },
          { transaction }
        );

        logger.info("Tạo khách hàng mới", {
          maKhachHang: customer.MaKhachHang,
          soDienThoai: cleanedSDT,
        });
      }

      const selectedTable = await findAvailableTable(
        SoNguoi,
        thoiGianBatDau,
        thoiGianKetThuc,
        transaction
      );

      if (!selectedTable) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: `Không còn bàn trống phù hợp cho ${SoNguoi} người trong khung giờ này. Vui lòng chọn thời gian khác.`,
        });
      }

      logger.info("Tìm thấy bàn phù hợp", {
        maBan: selectedTable.MaBan,
        tenBan: selectedTable.TenBan,
        sucChua: selectedTable.SucChua,
        soNguoi: SoNguoi,
      });

      const newReservation = await DatBan.create(
        {
          MaBan: selectedTable.MaBan,
          MaKH: customer.MaKhachHang,
          NgayDat: new Date(),
          ThoiGianBatDau: thoiGianBatDau,
          ThoiGianKetThuc: thoiGianKetThuc,
          SoNguoi: parseInt(SoNguoi),
          GhiChu: GhiChu || null,
        },
        { transaction }
      );

      let tongTienMonAn = 0;
      const chiTietDonHangList = [];

      if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
        for (const item of cartItems) {
          const monAn = await MonAn.findByPk(item.MaMon || item.maMon, {
            transaction,
          });

          if (!monAn) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: `Không tìm thấy món ăn với mã ${item.MaMon || item.maMon
                }`,
            });
          }

          const donGia = Number(monAn.Gia || monAn.gia) || 0; // ✅ FIX
          const soLuong = Number(item.SoLuong || item.soLuong) || 1; // ✅ FIX
          const thanhTien = donGia * soLuong;

          await DatBanMonAn.create(
            {
              MaDatBan: newReservation.MaDatBan,
              MaMon: monAn.MaMon,
              SoLuong: soLuong,
              DonGia: donGia,
              GhiChu: item.GhiChu || null,
            },
            { transaction }
          );

          chiTietDonHangList.push({
            MaMon: monAn.MaMon,
            SoLuong: soLuong,
            DonGia: donGia,
            ThanhTien: thanhTien,
          });

          tongTienMonAn += thanhTien; // ✅ Cộng số, không phải chuỗi
        }
      }

      // ========== ✅ BƯỚC 5: TẠO ĐƠN HÀNG TỪ ĐẶT BÀN (UPDATED) ==========
      const newOrder = await DonHang.create(
        {
          KhachHangID: customer.MaKhachHang,
          MaDatBan: newReservation.MaDatBan,
          LoaiDon: 'TaiCho', // ✅ NEW: Đánh dấu là đơn Tại chỗ
          NgayDat: new Date(),
          TrangThai: 'ChoXacNhan',
          TongTien: tongTienMonAn,
          DiaChiGiaoHang: `Bàn ${selectedTable.TenBan} - ${selectedTable.ViTri || 'Tại nhà hàng'}`,
        },
        { transaction }
      );

      // ✅ Tạo ChiTietDonHang từ món ăn đã chọn
      if (chiTietDonHangList.length > 0) {
        for (const chiTiet of chiTietDonHangList) {
          await ChiTietDonHang.create(
            {
              MaDonHang: newOrder.MaDonHang,
              MaMon: chiTiet.MaMon,
              SoLuong: chiTiet.SoLuong,
              DonGia: chiTiet.DonGia,
              ThanhTien: chiTiet.ThanhTien,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();

      // ========== BƯỚC 6: LẤY THÔNG TIN ĐẦY ĐỦ ==========
      const reservation = await DatBan.findByPk(newReservation.MaDatBan, {
        include: [
          {
            model: Ban,
            as: "ban",
          },
          {
            model: DatBanMonAn,
            as: "datBanMonAn",
            include: [
              {
                model: MonAn,
                as: "monAn",
              },
            ],
          },
          {
            model: DonHang, // ✅ Include đơn hàng vừa tạo
            as: "donHang",
          },
        ],
      });

      // ========== BƯỚC 7: GỬI EMAIL XÁC NHẬN ==========
      if (customer.Email) {
        sendReservationEmail(reservation, customer).catch((err) => {
          logger.error("Lỗi gửi email xác nhận đặt bàn", {
            error: err.message,
          });
        });
      }

      logger.info("Đặt bàn và tạo đơn hàng TẠI CHỖ thành công", {
        maDatBan: reservation.MaDatBan,
        maDonHang: newOrder.MaDonHang,
        loaiDon: 'TaiCho',
        maKhachHang: customer.MaKhachHang,
        soMonAn: cartItems?.length || 0,
        tongTien: tongTienMonAn,
      });

      return res.status(201).json({
        success: true,
        message: `Đặt bàn thành công! Bàn ${selectedTable.TenBan
          } đã được giữ cho bạn. ${customer.Email
            ? "Vui lòng kiểm tra email để xem thông tin chi tiết."
            : "Chúng tôi sẽ liên hệ lại với bạn."
          }`,
        data: {
          maDatBan: reservation.MaDatBan,
          maDonHang: newOrder.MaDonHang,
          loaiDon: 'TaiCho', // ✅ Trả về loại đơn
          tenBan: reservation.ban?.TenBan,
          sucChua: reservation.ban?.SucChua,
          thoiGian: reservation.ThoiGianBatDau,
          soNguoi: reservation.SoNguoi,
          tongTien: tongTienMonAn,
          khachHang: {
            hoTen: customer.HoTen,
            soDienThoai: customer.SoDienThoai,
            email: customer.Email,
          },
          monAn:
            reservation.datBanMonAn?.map((item) => ({
              tenMon: item.monAn?.TenMon,
              soLuong: item.SoLuong,
              donGia: item.DonGia,
            })) || [],
        },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error("Lỗi tạo đặt bàn và đơn hàng", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
};
