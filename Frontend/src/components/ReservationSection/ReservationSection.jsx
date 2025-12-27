import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FiCalendar, FiUsers, FiClock, FiPlus, FiMinus, FiTrash2, FiSearch } from "react-icons/fi";
import { Modal, Button, Input, Card, Empty } from "antd";
import api from "../../utils/axios";
import "./ReservationSection.css";

// ✅ Helper function: Lấy thời gian hiện tại theo định dạng datetime-local (YYYY-MM-DDTHH:mm)
const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const ReservationSection = () => {
    const [formData, setFormData] = useState({
        HoTen: "",
        SoDienThoai: "",
        Email: "",
        ThoiGianBatDau: getCurrentDateTimeLocal(), // ✅ Mặc định là thời gian hiện tại
        SoNguoi: 2,
        GhiChu: "",
    });
    const [loading, setLoading] = useState(false);

    // ✅ NEW: States cho chọn món
    const [menuItems, setMenuItems] = useState([]);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [selectedDishes, setSelectedDishes] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [tempCart, setTempCart] = useState({});

    // ✅ UPDATED: Load menu items + Auto-fill user info khi component mount
    useEffect(() => {
        // 1. Lấy thực đơn
        fetchMenuItems();

        // 2. Auto-fill thông tin user nếu đã đăng nhập
        try {
            const savedUserStr = localStorage.getItem("user");

            if (savedUserStr) {
                const userData = JSON.parse(savedUserStr);

                // ⚠️ MAPPING: Backend lưu SDT, nhưng form dùng SoDienThoai
                const hoTen = userData.HoTen || userData.hoTen || userData.fullName || "";
                const soDienThoai = userData.SDT || userData.SoDienThoai || userData.soDienThoai || userData.phone || "";
                const email = userData.Email || userData.email || "";

                // Auto-fill nếu có dữ liệu
                if (hoTen || soDienThoai || email) {
                    setFormData((prev) => ({
                        ...prev,
                        HoTen: hoTen,
                        SoDienThoai: soDienThoai, // ✅ Mapping SDT -> SoDienThoai
                        Email: email,
                    }));

                    console.log("✅ [ReservationSection] Auto-filled:", { hoTen, soDienThoai, email });
                }
            }
        } catch (error) {
            console.error("❌ [ReservationSection] Error auto-filling:", error);
        }
    }, []);

    const fetchMenuItems = async () => {
        try {
            const response = await api.get("/menu");
            setMenuItems(response.data.data || []);
        } catch (error) {
            console.error("Error fetching menu:", error);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // ✅ NEW: Handlers cho chọn món
    const handleOpenMenuModal = () => {
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
            const price = Number(dish.Gia) || 0; // ✅ FIX
            const quantity = Number(dish.SoLuong) || 0; // ✅ FIX
            return total + (price * quantity);
        }, 0); // ✅ CRITICAL: Số 0
    };
    const validateTime = (dateString) => {
        if (!dateString) return "Vui lòng chọn thời gian đặt bàn";

        const [datePart, timePart] = dateString.split('T');
        if (!datePart || !timePart) return "Thời gian không hợp lệ";

        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        const date = new Date(year, month - 1, day, hour, minute);
        const now = new Date();

        // 1. Cấm quá khứ
        if (date < now) return "Không thể chọn thời gian trong quá khứ";

        // 2. Cấm đặt quá xa (Max 3 ngày)
        const maxDate = new Date();
        maxDate.setDate(now.getDate() + 3);
        if (date > maxDate) return "Chỉ được đặt bàn trước tối đa 3 ngày";

        // 3. Giờ mở cửa (08:00)
        if (hour < 8) return "Nhà hàng mở cửa từ 08:00";

        // 4. Giờ đóng cửa (23:00) -> Last booking 21:00
        if (hour > 21 || (hour === 21 && minute > 0)) {
            return "Vui lòng đặt bàn trước 21:00 (Nhà hàng đóng cửa lúc 23:00)";
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // ✅ Validate thời gian trước khi gửi
            const timeError = validateTime(formData.ThoiGianBatDau);
            if (timeError) {
                toast.error(timeError);
                setLoading(false);
                return;
            }

            // ✅ Chuẩn bị cartItems nếu có món được chọn
            const cartItems = selectedDishes.map((dish) => ({
                MaMon: dish.MaMon,
                SoLuong: dish.SoLuong,
                GhiChu: "",
            }));

            await api.post("/public/dat-ban", {
                HoTen: formData.HoTen,
                SoDienThoai: formData.SoDienThoai,
                Email: formData.Email,
                ThoiGianBatDau: formData.ThoiGianBatDau,
                SoNguoi: parseInt(formData.SoNguoi),
                GhiChu: formData.GhiChu || "",
                cartItems: cartItems.length > 0 ? cartItems : undefined,
            });

            toast.success(
                `Đặt bàn thành công${cartItems.length > 0 ? ` với ${cartItems.length} món ăn` : ""}! Vui lòng kiểm tra email để xem thông tin chi tiết.`
            );

            // Reset form
            setFormData({
                HoTen: "",
                SoDienThoai: "",
                Email: "",
                ThoiGianBatDau: "",
                SoNguoi: 2,
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

    // Filter menu items based on search
    const filteredMenu = menuItems.filter((item) =>
        (item.TenMon || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <section className="reservation-section">
            <div className="container">
                <div className="reservation-header">
                    <h2 className="section-title">Đặt Bàn Ngay</h2>
                    <p className="section-subtitle">
                        Đặt bàn trước để đảm bảo chỗ của bạn và tận hưởng trải nghiệm tuyệt vời
                    </p>
                </div>

                <div className="reservation-grid">
                    {/* ✅ NEW: Left Column - Hero Image thay thế info cards */}
                    <div className="reservation-hero">
                        <div className="hero-image-wrapper">
                            <img
                                src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"
                                alt="Restaurant ambiance"
                                className="hero-background"
                            />
                            <div className="hero-overlay"></div>
                            <div className="hero-content">
                                <div className="hero-text">
                                    <h1 className="hero-title">Trải nghiệm ẩm thực đỉnh cao</h1>
                                    <p className="hero-description">
                                        Đặt bàn ngay để giữ chỗ tốt nhất cho bữa tiệc của bạn.
                                    </p>
                                </div>
                                <div className="hero-features">
                                    <div className="feature-item">
                                        <FiClock className="feature-icon" />
                                        <span>Giữ bàn 30 phút</span>
                                    </div>
                                    <div className="feature-item">
                                        <FiUsers className="feature-icon" />
                                        <span>Nhóm 1-20 người</span>
                                    </div>
                                    <div className="feature-item">
                                        <FiCalendar className="feature-icon" />
                                        <span>Đặt lịch linh hoạt</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ✅ UNCHANGED: Right Column - Form đặt bàn (GIỮ NGUYÊN 100%) */}
                    <div className="reservation-form-wrapper">
                        <form onSubmit={handleSubmit} className="reservation-form-compact">
                            <div className="form-row">
                                <input
                                    type="text"
                                    name="HoTen"
                                    value={formData.HoTen}
                                    onChange={handleChange}
                                    required
                                    placeholder="Họ và tên *"
                                    className="form-input"
                                />
                                <input
                                    type="tel"
                                    name="SoDienThoai"
                                    value={formData.SoDienThoai}
                                    onChange={handleChange}
                                    required
                                    placeholder="Số điện thoại *"
                                    className="form-input"
                                />
                            </div>

                            <input
                                type="email"
                                name="Email"
                                value={formData.Email}
                                onChange={handleChange}
                                required
                                placeholder="Email *"
                                className="form-input"
                            />

                            <div className="form-row">
                                <input
                                    type="datetime-local"
                                    name="ThoiGianBatDau"
                                    value={formData.ThoiGianBatDau}
                                    onChange={handleChange}
                                    required
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="form-input"
                                />
                                <input
                                    type="number"
                                    name="SoNguoi"
                                    value={formData.SoNguoi}
                                    onChange={handleChange}
                                    required
                                    min="1"
                                    max="20"
                                    placeholder="Số người *"
                                    className="form-input"
                                />
                            </div>

                            {/* ✅ NEW: Nút chọn món */}
                            <div className="form-group-dishes">
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Món ăn đặt trước (Tùy chọn)
                                </label>
                                <button
                                    type="button"
                                    className="add-dish-btn-compact"
                                    onClick={handleOpenMenuModal}
                                >
                                    <FiPlus size={18} />
                                    <span>Chọn món ăn kèm</span>
                                </button>

                                {/* ✅ Hiển thị danh sách món đã chọn */}
                                {selectedDishes.length > 0 && (
                                    <div className="selected-dishes-compact">
                                        {selectedDishes.map((dish) => {
                                            const price = Number(dish.Gia) || 0; // ✅ FIX
                                            const quantity = Number(dish.SoLuong) || 0; // ✅ FIX
                                            const itemTotal = price * quantity;

                                            return (
                                                <div key={dish.MaMon} className="dish-item-compact">
                                                    <img
                                                        src={dish.HinhAnh}
                                                        alt={dish.TenMon}
                                                        className="dish-thumb-small"
                                                    />
                                                    <div className="dish-info-compact">
                                                        <strong>{dish.TenMon}</strong>
                                                        <span className="dish-quantity-small">x{quantity}</span>
                                                    </div>
                                                    <div className="dish-price-small">
                                                        {Math.round(itemTotal).toLocaleString("vi-VN")} VNĐ
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="remove-dish-btn-small"
                                                        onClick={() => handleRemoveDish(dish.MaMon)}
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        <div className="dishes-total-compact">
                                            <strong>Tổng tiền:</strong>
                                            <span>{Math.round(calculateTotal()).toLocaleString("vi-VN")} VNĐ</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <textarea
                                name="GhiChu"
                                value={formData.GhiChu}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Ghi chú (tùy chọn)"
                                className="form-textarea"
                            />

                            <button
                                type="submit"
                                className="submit-btn-compact"
                                disabled={loading}
                            >
                                {loading ? "Đang xử lý..." : "Xác nhận đặt bàn"}
                            </button>

                            <p className="form-note">
                                *Chúng tôi sẽ giữ bàn trong 30 phút kể từ giờ đặt
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {/* ✅ UNCHANGED: Menu Modal (GIỮ NGUYÊN 100%) */}
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
                className="menu-modal-reservation"
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

                    <div className="menu-grid-modal">
                        {filteredMenu.length > 0 ? (
                            filteredMenu.map((item) => {
                                const qty = tempCart[item.MaMon] || 0;
                                return (
                                    <Card
                                        key={item.MaMon}
                                        hoverable
                                        className={`menu-card-modal ${qty > 0 ? "selected" : ""}`}
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
                                                        {(() => {
                                                            const price = parseFloat(item.Gia || 0);
                                                            return isNaN(price) ? '0' : Math.round(price).toLocaleString('vi-VN');
                                                        })()} VNĐ
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
        </section>
    );
};

export default ReservationSection;
