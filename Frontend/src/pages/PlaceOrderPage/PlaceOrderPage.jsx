import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { StoreContext } from "../../Context/StoreContext";
import api from "../../utils/axios";
import { buildFileUrl } from "../../config/apiConfig"; // ✅ Import helper
import "./PlaceOrderPage.css";
import Loading from "../../components/Loading/Loading"; // ✅ NEW

const PlaceOrderPage = () => {
  const {
    getCartItemsWithDetails,
    getTotalCartAmount,
    token,
    user,
    setCartItems,
  } = useContext(StoreContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showQRModal, setShowQRModal] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [promotionCode, setPromotionCode] = useState("");

  // ✅ FIXED: State khai báo đúng tên
  const [formData, setFormData] = useState({
    DiaChi: user?.DiaChi || "",
    SoDienThoai: user?.SDT || user?.SoDienThoai || "",
  });

  const cartItems = getCartItemsWithDetails();
  const baseAmount = getTotalCartAmount();

  // ✅ Tính tổng tiền sau khi áp dụng khuyến mãi
  const calculateFinalAmount = () => {
    if (!selectedPromotion) return baseAmount;

    let discount = 0;
    if (selectedPromotion.LoaiGiamGia === 'PhanTram') {
      discount = (baseAmount * selectedPromotion.GiaTriGiam) / 100;
    } else {
      discount = Number(selectedPromotion.GiaTriGiam);
    }

    return Math.max(0, baseAmount - discount);
  };

  const totalAmount = calculateFinalAmount();

  // ✅ Fetch promotions khi component mount
  React.useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const response = await api.get("/promotions");
        const activePromotions = (response.data.data || []).filter(promotion => {
          const today = new Date();
          const startDate = new Date(promotion.NgayBatDau);
          const endDate = new Date(promotion.NgayKetThuc);
          return today >= startDate && today <= endDate;
        });
        setPromotions(activePromotions);
      } catch (error) {
        console.error("Error fetching promotions:", error);
      }
    };

    fetchPromotions();
  }, []);

  // ✅ FIXED: generateQRCode sử dụng đúng tên biến
  const generateQRCode = () => {
    const bankCode = 'MB';
    const accountNumber = '2506200466666';
    const accountName = 'NGO TRI ANH VU';
    const amount = Math.round(totalAmount);
    const addInfo = encodeURIComponent(`DH ${formData.SoDienThoai}`); // ✅ formData thay vì data

    return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact.png?amount=${amount}&addInfo=${addInfo}&accountName=${encodeURIComponent(accountName)}`;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ✅ Handler áp dụng mã khuyến mãi
  const handleApplyPromotion = () => {
    if (!promotionCode.trim()) {
      toast.error("Vui lòng nhập mã khuyến mãi");
      return;
    }

    const promotion = promotions.find(p =>
      // Tìm theo MaApDung thay vì MaKM
      (p.MaApDung || p.maApDung || p.MaKM || p.maKM).toString().toLowerCase() === promotionCode.toLowerCase()
    );

    if (!promotion) {
      toast.error("Mã khuyến mãi không hợp lệ hoặc đã hết hạn");
      return;
    }

    setSelectedPromotion(promotion);
    toast.success(`Đã áp dụng khuyến mãi: ${promotion.TenKM}`);
  };

  // ✅ Handler xóa khuyến mãi
  const handleRemovePromotion = () => {
    setSelectedPromotion(null);
    setPromotionCode("");
    toast.info("Đã xóa mã khuyến mãi");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!token) {
        toast.error("Vui lòng đăng nhập để đặt hàng");
        navigate("/");
        return;
      }

      const ChiTietList = cartItems.map((item) => ({
        MaMon: item.MaMon || item._id,
        SoLuong: item.quantity,
      }));

      // ✅ Tính discount amount nếu có promotion
      let discountAmount = 0;
      if (selectedPromotion) {
        if (selectedPromotion.LoaiGiamGia === 'PhanTram') {
          discountAmount = (baseAmount * selectedPromotion.GiaTriGiam) / 100;
        } else {
          discountAmount = Number(selectedPromotion.GiaTriGiam);
        }
      }

      // ✅ NEW: Gửi kèm paymentMethod và promotion
      const orderResponse = await api.post("/orders", {
        ChiTietList,
        shippingInfo: {
          DiaChi: formData.DiaChi,
          SoDienThoai: formData.SoDienThoai,
        },
        paymentMethod, // ✅ NEW: 'cod' hoặc 'banking'
        PromotionId: selectedPromotion ? (selectedPromotion.MaKM || selectedPromotion.maKM) : null, // ✅ NEW
        DiscountAmount: discountAmount, // ✅ NEW
      });

      // ✅ Thông báo khác nhau theo phương thức thanh toán
      if (paymentMethod === 'banking') {
        toast.success(
          <div>
            <div><strong>Đặt hàng thành công!</strong></div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Vui lòng hoàn tất thanh toán qua QR Code.
              Đơn hàng sẽ được xử lý sau khi xác nhận thanh toán.
            </div>
          </div>,
          { autoClose: 5000 }
        );
      } else {
        toast.success(
          "Đặt hàng thành công! " +
          (orderResponse.data.data?.khachHang?.Email
            ? "Vui lòng kiểm tra email để xem chi tiết."
            : "Chúng tôi sẽ liên hệ lại với bạn.")
        );
      }

      setCartItems({});

      setTimeout(() => {
        navigate("/myorders");
      }, 1500);
    } catch (error) {
      console.error("Error creating order:", error);
      const errorMessage =
        error.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
      toast.error(errorMessage);

      if (error.response?.status === 401) {
        setTimeout(() => navigate("/"), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Tự động mở modal khi chọn banking
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    if (method === 'banking') {
      setShowQRModal(true); // ✅ Mở modal ngay lập tức
    }
  };

  // ✅ NEW: Hiển thị Loading khi processing
  if (loading) {
    return <Loading />;
  }

  if (!token) {
    return (
      <div className="place-order-page">
        <div className="empty-cart">
          <h2>Vui lòng đăng nhập</h2>
          <p>Bạn cần đăng nhập để đặt hàng</p>
          <button onClick={() => navigate("/")} className="submit-btn">
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="place-order-page">
        <div className="empty-cart">
          <h2>Giỏ hàng trống</h2>
          <p>Vui lòng thêm món ăn vào giỏ hàng trước khi đặt hàng</p>
        </div>
      </div>
    );
  }

  return (
    <div className="place-order-page">
      <div className="order-container">
        <h1>Xác nhận đơn hàng</h1>

        <div className="order-content">
          {/* Cart Summary */}
          <div className="cart-summary">
            <h2>Giỏ hàng của bạn</h2>
            <div className="cart-items">
              {cartItems.map((item) => {
                const price = Number(item.Gia || item.price) || 0; // ✅ FIX: Number()
                const quantity = Number(item.quantity) || 0; // ✅ FIX: Number()
                const itemTotal = price * quantity;

                return (
                  <div key={item.MaMon || item._id} className="cart-item">
                    <img
                      src={item.HinhAnh ? (item.HinhAnh.startsWith("http") ? item.HinhAnh : buildFileUrl(item.HinhAnh)) : (item.image ? (item.image.startsWith("http") ? item.image : buildFileUrl(item.image)) : "")}
                      alt={item.TenMon || item.name}
                      onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=No+Img"; }}
                    />
                    <div className="item-info">
                      <h3>{item.TenMon || item.name}</h3>
                      <p>{Math.round(price).toLocaleString('vi-VN')} VNĐ</p>
                    </div>
                    <div className="item-quantity">x{quantity}</div>
                    <div className="item-total">
                      {Math.round(itemTotal).toLocaleString("vi-VN")} VNĐ
                    </div>
                  </div>
                );
              })}
            </div>
            {/* ✅ NEW: Promotion & Total Section */}
            <div className="cart-total-section">
              {selectedPromotion && (
                <div className="promotion-applied">
                  <div className="promotion-info">
                    <span className="promotion-badge">{selectedPromotion.TenKM}</span>
                    <button
                      type="button"
                      className="remove-promotion-btn"
                      onClick={handleRemovePromotion}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="price-breakdown">
                    <div className="price-row">
                      <span>Tổng gốc:</span>
                      <span>{Math.round(baseAmount).toLocaleString("vi-VN")} VNĐ</span>
                    </div>
                    <div className="price-row discount">
                      <span>Giảm giá:</span>
                      <span>-{Math.round(baseAmount - totalAmount).toLocaleString("vi-VN")} VNĐ</span>
                    </div>
                    <div className="price-row total">
                      <strong>Thành tiền:</strong>
                      <strong className="final-price">{Math.round(totalAmount).toLocaleString("vi-VN")} VNĐ</strong>
                    </div>
                  </div>
                </div>
              )}

              {!selectedPromotion && (
                <div className="cart-total">
                  <strong>
                    Tổng tiền: {Math.round(baseAmount).toLocaleString("vi-VN")} VNĐ
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Form */}
          <form onSubmit={handleSubmit} className="delivery-form">
            <h2>Thông tin giao hàng</h2>

            {/* ✅ NEW: Promotion Code Section */}
            <div className="form-group promotion-section">
              <label htmlFor="promotionCode">
                Mã khuyến mãi (Tùy chọn)
              </label>
              <div className="promotion-input-wrapper">
                <input
                  type="text"
                  id="promotionCode"
                  value={promotionCode}
                  onChange={(e) => setPromotionCode(e.target.value)}
                  placeholder="Nhập mã khuyến mãi"
                  disabled={!!selectedPromotion}
                  className={selectedPromotion ? 'disabled' : ''}
                />
                <button
                  type="button"
                  onClick={handleApplyPromotion}
                  className="apply-promotion-btn"
                  disabled={!!selectedPromotion}
                >
                  {selectedPromotion ? '✓ Đã áp dụng' : 'Áp dụng'}
                </button>
              </div>
              {promotions.length > 0 && !selectedPromotion && (
                <div className="available-promotions">
                  <small>Mã khả dụng: </small>
                  {promotions.slice(0, 3).map((promo, idx) => (
                    <span
                      key={idx}
                      className="promo-code-tag"
                      onClick={() => {
                        // Sử dụng MaApDung để hiển thị và tìm kiếm
                        setPromotionCode(promo.MaApDung || promo.maApDung || promo.MaKM);
                        setSelectedPromotion(promo);
                        toast.success(`Đã áp dụng: ${promo.TenKM}`);
                      }}
                    >
                      {promo.MaApDung || promo.maApDung || promo.MaKM}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="SoDienThoai">Số điện thoại *</label>
              <input
                type="tel"
                id="SoDienThoai"
                name="SoDienThoai"
                value={formData.SoDienThoai} // ✅ FIXED: formData thay vì data
                onChange={handleChange}
                required
                placeholder="Nhập số điện thoại"
              />
            </div>

            <div className="form-group">
              <label htmlFor="DiaChi">Địa chỉ giao hàng *</label>
              <textarea
                id="DiaChi"
                name="DiaChi"
                value={formData.DiaChi} // ✅ FIXED: formData
                onChange={handleChange}
                required
                rows="3"
                placeholder="Nhập địa chỉ giao hàng"
              />
            </div>

            {/* ✅ UPDATED: Phương thức thanh toán - Tự động mở modal */}
            <div className="form-group">
              <label>Phương thức thanh toán *</label>
              <div className="payment-methods">
                <div
                  className={`payment-option ${paymentMethod === 'cod' ? 'active' : ''}`}
                  onClick={() => handlePaymentMethodChange('cod')} // ✅ UPDATED
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => handlePaymentMethodChange('cod')} // ✅ UPDATED
                  />
                  <div className="payment-option-content">
                    <div className="payment-details">
                      <strong>Tiền mặt (COD)</strong>
                      <p>Thanh toán khi nhận hàng</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`payment-option ${paymentMethod === 'banking' ? 'active' : ''}`}
                  onClick={() => handlePaymentMethodChange('banking')} // ✅ UPDATED
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="banking"
                    checked={paymentMethod === 'banking'}
                    onChange={() => handlePaymentMethodChange('banking')} // ✅ UPDATED
                  />
                  <div className="payment-option-content">
                    <div className="payment-details">
                      <strong>Chuyển khoản ngân hàng</strong>
                      <p>Thanh toán qua QR Code</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Đang xử lý..." : paymentMethod === 'banking' ? "Xác nhận Đơn hàng" : "Đặt hàng"}
            </button>
          </form>
        </div>
      </div>

      {/* ✅ UPDATED: QR Modal - Mở khi chọn banking */}
      {showQRModal && paymentMethod === 'banking' && (
        <div className="qr-modal-overlay" onClick={() => {
          setShowQRModal(false);
          setPaymentMethod('cod'); // ✅ Reset về COD khi đóng modal
        }}>
          <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              className="qr-modal-close"
              onClick={() => {
                setShowQRModal(false);
                setPaymentMethod('cod'); // ✅ Reset về COD
              }}
              aria-label="Đóng"
            >
              ✕
            </button>

            {/* Header */}
            <div className="qr-modal-header">
              <h3>Quét mã QR để thanh toán</h3>
              <p className="qr-note">
                Vui lòng quét mã và <strong>nhập nội dung chuyển khoản là SĐT của bạn</strong>
              </p>
            </div>

            {/* Body */}
            <div className="qr-modal-body">
              <div className="qr-code-wrapper">
                <img
                  src={generateQRCode()}
                  alt="QR Code Thanh toán"
                  className="qr-code-img"
                />
              </div>

              <div className="bank-info-wrapper">
                <div className="bank-info-item">
                  <span className="label">Ngân hàng:</span>
                  <span className="value">MB Bank</span>
                </div>
                <div className="bank-info-item">
                  <span className="label">Số TK:</span>
                  <span className="value">2506200466666</span>
                </div>
                <div className="bank-info-item">
                  <span className="label">Chủ TK:</span>
                  <span className="value">NGO TRI ANH VU</span>
                </div>
                <div className="bank-info-item">
                  <span className="label">Số tiền:</span>
                  <span className="value amount">{Math.round(totalAmount).toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div className="bank-info-item transfer-note">
                  <span className="label">Nội dung:</span>
                  <code className="transfer-code">DH {formData.SoDienThoai}</code>
                </div>
              </div>

              <div className="qr-warning-box">
                <p><strong>Lưu ý:</strong> Đơn hàng sẽ được xử lý sau khi chúng tôi xác nhận thanh toán thành công.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="qr-modal-footer">
              <button
                type="button"
                className="qr-modal-confirm-btn"
                onClick={() => {
                  setShowQRModal(false);
                  // Toast thông báo
                  toast.info(
                    <div>
                      <strong>Đã ghi nhận!</strong>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        Vui lòng bấm nút "Xác nhận Đơn hàng" bên dưới sau khi hoàn tất chuyển khoản.
                      </div>
                    </div>,
                    { autoClose: 4000 }
                  );
                }}
              >
                Đã chuyển khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceOrderPage;
