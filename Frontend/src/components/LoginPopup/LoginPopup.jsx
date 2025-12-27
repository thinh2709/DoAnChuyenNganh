import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { StoreContext } from "../../Context/StoreContext";
import { FiUser, FiMail, FiLock, FiMapPin, FiPhone, FiX } from "react-icons/fi";
import { assets } from "../../assets/assets";
import "./LoginPopup.css";
import api from "../../utils/axios";

const LoginPopup = ({ setShowLogin }) => {
  const [currState, setCurrState] = useState("Login"); // "Login" or "Sign Up"
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(StoreContext);

  // Lock body scroll when component mounts
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // ✅ FIXED: Clear error khi user bắt đầu nhập lại
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // ✅ Clear error ngay khi user nhập
    if (error) {
      setError("");
    }
  };

  // ✅ FIXED: Handle form submit với error handling chuẩn
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (currState === "Login") {
        // ✅ FIXED: Login - Gửi email vào TenDangNhap (backend sẽ check cả 2)
        const response = await api.post("/users/login", {
          TenDangNhap: formData.email, // ✅ Backend sẽ tìm theo email hoặc username
          MatKhau: formData.password,
        });

        if (response.data.success && response.data.data) {
          const { token, user } = response.data.data;

          // ✅ Lưu thông tin vào localStorage ngay lập tức
          try {
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            console.log("✅ Saved to localStorage:", { token, user });
          } catch (storageError) {
            console.error("❌ Error saving to localStorage:", storageError);
          }

          // ✅ Gọi login function từ Context
          login(token, user);

          setShowLogin(false);
          navigate("/");
        } else {
          setError(response.data.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        }
      } else {
        // ✅ FIXED: Sign Up - Mapping dữ liệu khớp với Database
        const CUSTOMER_ROLE_ID = 2; // ID vai trò Khách hàng trong DB (Kiểm tra lại trong bảng VaiTro)

        // ⚠️ Mapping: Frontend → Backend (khớp với controller)
        const payload = {
          HoTen: formData.fullName,              // ✅ HoTen (required)
          TenDangNhap: formData.email.split('@')[0], // ✅ TenDangNhap (required) - Tạo từ email
          Email: formData.email,                 // ✅ Email (required)
          SDT: formData.phone,                   // ✅ SDT (required) - KHÔNG PHẢI SoDienThoai
          MatKhau: formData.password,            // ✅ MatKhau (required)
          MaVaiTro: CUSTOMER_ROLE_ID,            // ✅ MaVaiTro - KHÔNG PHẢI VaiTroID
          DiaChi: formData.address,              // ✅ DiaChi (optional)
        };

        const response = await api.post("/users/register", payload);

        if (response.data.success) {
          setCurrState("Login");
          setFormData((prev) => ({ ...prev, password: "" }));
          setError("Đăng ký thành công! Vui lòng đăng nhập.");
        } else {
          setError(response.data.message || "Đăng ký thất bại. Vui lòng thử lại.");
        }
      }
    } catch (err) {
      console.error("Login/Register Error:", err);

      let errorMessage = "Có lỗi xảy ra. Vui lòng thử lại.";

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle switch mode (Login <-> Sign Up)
  const handleSwitchMode = (newMode) => {
    setCurrState(newMode);
    setError(""); // Clear error khi chuyển mode
    setFormData({
      email: "",
      password: "",
      fullName: "",
      phone: "",
      address: "",
    });
  };

  return (
    <div
      className="login-popup"
      onClick={(e) =>
        e.target.className === "login-popup" && setShowLogin(false)
      }
    >
      <form className="login-popup-container" onSubmit={handleSubmit}>
        <button
          type="button"
          className="close-button"
          onClick={() => setShowLogin(false)}
          aria-label="Đóng"
        >
          <FiX />
        </button>

        <div className="login-popup-header">
          <img src={assets.logo} alt="Techzy Restaurant Logo" className="login-popup-logo" />
          <h2>{currState === "Login" ? "Đăng nhập" : "Đăng ký"}</h2>
          <p className="login-subtitle">Techzy Restaurant</p>
        </div>

        {/* ✅ FIXED: Hiển thị error message với conditional styling */}
        {error && (
          <div
            className={`error-message ${error.includes('✅') ? 'success-message' : ''}`}
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="login-popup-inputs">
          {currState === "Sign Up" && (
            <>
              <div className="input-group">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Họ và tên"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="input-group">
                <FiPhone className="input-icon" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Số điện thoại"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10,11}"
                  title="Số điện thoại phải có 10-11 chữ số"
                  autoComplete="tel"
                />
              </div>
              <div className="input-group">
                <FiMapPin className="input-icon" />
                <input
                  type="text"
                  name="address"
                  placeholder="Địa chỉ"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  autoComplete="street-address"
                />
              </div>
            </>
          )}
          <div className="input-group">
            <FiMail className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <FiLock className="input-icon" />
            <input
              type="password"
              name="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              autoComplete={currState === "Login" ? "current-password" : "new-password"}
            />
          </div>
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={loading}
        >
          {loading ? (
            <span>Đang xử lý...</span>
          ) : (
            <span>{currState === "Login" ? "Đăng nhập" : "Đăng ký"}</span>
          )}
        </button>

        <p className="login-popup-switch">
          {currState === "Login" ? (
            <>
              Chưa có tài khoản?{" "}
              <span onClick={() => handleSwitchMode("Sign Up")}>
                Đăng ký
              </span>
            </>
          ) : (
            <>
              Đã có tài khoản?{" "}
              <span onClick={() => handleSwitchMode("Login")}>
                Đăng nhập
              </span>
            </>
          )}
        </p>
      </form>
    </div>
  );
};

export default LoginPopup;
