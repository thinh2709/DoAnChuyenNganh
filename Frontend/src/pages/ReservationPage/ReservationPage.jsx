import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Modal, Button, Input, Card, Empty } from "antd";
import { FiPlus, FiMinus, FiTrash2, FiSearch } from "react-icons/fi";
import api from "../../utils/axios";
import Loading from "../../components/Loading/Loading"; // ✅ NEW
import "./ReservationPage.css";

const ReservationPage = () => {
  const [formData, setFormData] = useState({
    HoTen: "",
    SoDienThoai: "",
    Email: "",
    ThoiGianBatDau: "",
    SoNguoi: 1,
    GhiChu: "",
  });
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tempCart, setTempCart] = useState({});

  // ✅ NEW: Auto-fill thông tin user nếu đã đăng nhập
  useEffect(() => {
    try {
      // Lấy thông tin user từ localStorage
      const savedUserStr = localStorage.getItem("user");

      if (savedUserStr) {
        const userData = JSON.parse(savedUserStr);

        // Mapping: Kiểm tra các tên field có thể có trong userData
        const hoTen = userData.HoTen || userData.hoTen || userData.fullName || userData.name || "";
        const soDienThoai = userData.SoDienThoai || userData.soDienThoai || userData.SDT || userData.phone || "";
        const email = userData.Email || userData.email || "";

        // Auto-fill nếu có dữ liệu
        if (hoTen || soDienThoai || email) {
          setFormData((prev) => ({
            ...prev,
            HoTen: hoTen,
            SoDienThoai: soDienThoai,
            Email: email,
          }));

          console.log("✅ Auto-filled user info:", { hoTen, soDienThoai, email });
        }
      }
    } catch (error) {
      console.error("❌ Error auto-filling user info:", error);
    }
  }, []); // Chỉ chạy 1 lần khi component mount

  // Load menu items khi component mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await api.get("/menu");
      setMenuItems(response.data.data || []);
    } catch (error) {
      console.error("Error fetching menu:", error);
      toast.error("Không thể tải thực đơn");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleOpenMenuModal = () => {
    // Khởi tạo tempCart từ selectedDishes hiện tại
    const cart = {};
    selectedDishes.forEach((dish) => {
      cart[dish.MaMon] = dish.SoLuong;
    });
    setTempCart(cart);
    setShowMenuModal(true);
  };

  const handleCloseMenuModal = () => {
    setShowMenuModal(false);
    setSearchTerm("");
    setTempCart({});
  };

  const handleUpdateQuantity = (maMon, change) => {
    setTempCart((prev) => {
      const currentQty = prev[maMon] || 0;
      const newQty = currentQty + change;

      if (newQty <= 0) {
        const { [maMon]: removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [maMon]: newQty,
      };
    });
  };

  const handleConfirmDishes = () => {
    // Convert tempCart to selectedDishes array
    const dishes = menuItems
      .filter((item) => tempCart[item.MaMon] > 0)
      .map((item) => ({
        MaMon: item.MaMon,
        TenMon: item.TenMon,
        Gia: item.Gia,
        HinhAnh: item.HinhAnh,
        SoLuong: tempCart[item.MaMon],
      }));

    setSelectedDishes(dishes);
    handleCloseMenuModal();

    if (dishes.length > 0) {
      toast.success(`Đã chọn ${dishes.length} món`);
    }
  };

  const handleRemoveDish = (maMon) => {
    setSelectedDishes((prev) => prev.filter((dish) => dish.MaMon !== maMon));
    toast.info("Đã xóa món");
  };

  const calculateTotal = () => {
    return selectedDishes.reduce((total, dish) => {
      // ✅ FIX: Ép kiểu về số trước khi tính
      const price = Number(dish.Gia) || 0;
      const quantity = Number(dish.SoLuong) || 0;
      return total + (price * quantity);
    }, 0); // ✅ CRITICAL: Khởi tạo là số 0, không phải '0'
  };

  // ✅ NEW: Hàm validate giờ
  const validateTime = (dateString, type = 'start') => {
    if (!dateString) return null;

    // Parse thủ công để đảm bảo là local time (giống admin form)
    const [datePart, timePart] = dateString.split('T');
    if (!datePart || !timePart) return null;

    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const date = new Date(year, month - 1, day, hour, minute);
    const now = new Date();

    if (type === 'start') {
      // 1. Cấm quá khứ
      if (date < now) return "Không thể chọn thời gian trong quá khứ";

      // 2. Cấm đặt quá xa (Max 3 ngày)
      const maxDate = new Date();
      maxDate.setDate(now.getDate() + 3);
      if (date > maxDate) {
        return "Chỉ được đặt bàn trước tối đa 3 ngày";
      }

      // 3. Giờ mở cửa (08:00)
      const hourOfDay = date.getHours();
      if (hourOfDay < 8) return "Nhà hàng chưa mở cửa (08:00)";

      // 4. Giờ đóng cửa (23:00) -> Last booking 21:00
      // Đặt truoc 21:00 (tức <= 21:00 nếu phút = 0, hoặc < 21:00)
      if (hourOfDay > 21 || (hourOfDay === 21 && minute > 0)) {
        return "Vui lòng đặt bàn trước 21:00 (Nhà hàng đóng cửa lúc 23:00)";
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ Validate Client Side
      const timeError = validateTime(formData.ThoiGianBatDau, 'start');
      if (timeError) {
        toast.error(timeError);
        setLoading(false);
        return;
      }

      // Chuẩn bị cartItems
      const cartItems = selectedDishes.map((dish) => ({
        MaMon: dish.MaMon,
        SoLuong: dish.SoLuong,
        GhiChu: "",
      }));

      // Gọi API public đặt bàn
      // GỬI NGUYÊN datetime-local string KHÔNG chuyển timezone
      await api.post("/public/dat-ban", {
        HoTen: formData.HoTen,
        SoDienThoai: formData.SoDienThoai,
        Email: formData.Email,
        // GỬI TRỰC TIẾP giá trị datetime-local, KHÔNG chuyển sang UTC
        ThoiGianBatDau: formData.ThoiGianBatDau,
        SoNguoi: parseInt(formData.SoNguoi),
        GhiChu: formData.GhiChu || "",
        cartItems: cartItems.length > 0 ? cartItems : undefined,
      });

      toast.success(
        `Đặt bàn thành công${cartItems.length > 0 ? ` với ${cartItems.length} món ăn` : ""
        }! Vui lòng kiểm tra email để xem thông tin chi tiết.`
      );

      // Reset form
      setFormData({
        HoTen: "",
        SoDienThoai: "",
        Email: "",
        ThoiGianBatDau: "",
        SoNguoi: 1,
        GhiChu: "",
      });
      setSelectedDishes([]);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Hiển thị Loading khi submit
  if (loading) {
    return <Loading />;
  }

  // Filter menu items based on search
  const filteredMenu = menuItems.filter((item) =>
    (item.TenMon || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="reservation-page">
      <div className="reservation-container">
        <h1>Đặt bàn</h1>
        <p className="subtitle">Vui lòng điền thông tin để đặt bàn</p>
        <p className="info-note">
          ⏰ <strong>Lưu ý:</strong> Thời gian đặt bàn mặc định là 2 giờ
        </p>

        <form onSubmit={handleSubmit} className="reservation-form">
          <div className="form-group">
            <label htmlFor="HoTen">Họ và tên *</label>
            <input
              type="text"
              id="HoTen"
              name="HoTen"
              value={formData.HoTen}
              onChange={handleChange}
              required
              placeholder="Nhập họ và tên"
            />
          </div>

          <div className="form-group">
            <label htmlFor="SoDienThoai">Số điện thoại *</label>
            <input
              type="tel"
              id="SoDienThoai"
              name="SoDienThoai"
              value={formData.SoDienThoai}
              onChange={handleChange}
              required
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div className="form-group">
            <label htmlFor="Email">Email *</label>
            <input
              type="email"
              id="Email"
              name="Email"
              value={formData.Email}
              onChange={handleChange}
              required
              placeholder="Nhập email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ThoiGianBatDau">Thời gian đến *</label>
            <input
              type="datetime-local"
              id="ThoiGianBatDau"
              name="ThoiGianBatDau"
              value={formData.ThoiGianBatDau}
              onChange={handleChange}
              required
              min={new Date().toISOString().slice(0, 16)}
              style={{
                paddingLeft: '16px',
                fontSize: '15px',
                fontWeight: 500
              }}
            />
            <small className="helper-text" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              color: '#666'
            }}>
              ⏰ Chúng tôi sẽ giữ bàn cho bạn trong 30 phút kể từ thời gian này
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="SoNguoi">Số người *</label>
            <input
              type="number"
              id="SoNguoi"
              name="SoNguoi"
              value={formData.SoNguoi}
              onChange={handleChange}
              required
              min="1"
              max="20"
            />
          </div>

          {/* ✅ UPDATED: Phần Chọn món với nút mới */}
          <div className="form-group">
            <label>Món ăn đặt trước (Tùy chọn)</label>
            <button
              type="button"
              className="add-dish-btn"
              onClick={handleOpenMenuModal}
            >
              <FiPlus size={20} />
              <span>Thêm món ăn yêu thích</span>
            </button>

            {selectedDishes.length > 0 && (
              <div className="selected-dishes">
                <h4>Các món đã chọn:</h4>
                {selectedDishes.map((dish) => {
                  // ✅ FIX: Tính toán đúng itemTotal
                  const price = Number(dish.Gia) || 0;
                  const quantity = Number(dish.SoLuong) || 0;
                  const itemTotal = price * quantity;

                  return (
                    <div key={dish.MaMon} className="dish-item">
                      <img
                        src={dish.HinhAnh}
                        alt={dish.TenMon}
                        className="dish-thumb"
                      />
                      <div className="dish-info">
                        <strong>{dish.TenMon}</strong>
                        <span className="dish-quantity">x{quantity}</span>
                      </div>
                      <div className="dish-price">
                        {Math.round(itemTotal).toLocaleString("vi-VN")} VNĐ
                      </div>
                      <button
                        type="button"
                        className="remove-dish-btn"
                        onClick={() => handleRemoveDish(dish.MaMon)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  );
                })}
                <div className="dishes-total">
                  <strong>Tổng tiền dự kiến:</strong>
                  <span>{Math.round(calculateTotal()).toLocaleString("vi-VN")} VNĐ</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="GhiChu">Ghi chú</label>
            <textarea
              id="GhiChu"
              name="GhiChu"
              value={formData.GhiChu}
              onChange={handleChange}
              rows="4"
              placeholder="Ghi chú thêm (nếu có)"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Đang xử lý..." : "Gửi đặt bàn"}
          </button>
        </form>
      </div>

      {/* Menu Modal */}
      <Modal
        title="Chọn món ăn"
        open={showMenuModal}
        onCancel={handleCloseMenuModal}
        footer={[
          <Button key="cancel" onClick={handleCloseMenuModal}>
            Hủy
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmDishes}>
            Xác nhận (
            {Object.values(tempCart).reduce((sum, qty) => sum + qty, 0)} món)
          </Button>,
        ]}
        width={900}
        className="menu-modal"
      >
        <div className="menu-modal-content">
          <div className="menu-search">
            <Input
              prefix={<FiSearch />}
              placeholder="Tìm kiếm món ăn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="large"
              allowClear
            />
          </div>

          <div className="menu-grid">
            {filteredMenu.length > 0 ? (
              filteredMenu.map((item) => {
                const qty = tempCart[item.MaMon] || 0;
                return (
                  <Card
                    key={item.MaMon}
                    hoverable
                    className={`menu-card ${qty > 0 ? "selected" : ""}`}
                    cover={
                      <img
                        alt={item.TenMon}
                        src={item.HinhAnh}
                        className="menu-card-image"
                      />
                    }
                  >
                    <Card.Meta
                      title={item.TenMon}
                      description={
                        <div className="menu-card-footer">
                          <span className="menu-price">
                            {parseFloat(item.Gia || 0).toLocaleString("vi-VN")}{" "}
                            VNĐ
                          </span>
                          <div className="quantity-controls">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQuantity(item.MaMon, -1)
                              }
                              disabled={qty === 0}
                            >
                              <FiMinus />
                            </button>
                            <span className="quantity">{qty}</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQuantity(item.MaMon, 1)
                              }
                            >
                              <FiPlus />
                            </button>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                );
              })
            ) : (
              <Empty description="Không tìm thấy món ăn" />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReservationPage;
