import React, { useState, useEffect } from "react";
import { Dropdown } from "antd";
import { FiSearch, FiLogOut, FiChevronDown, FiUser, FiSettings, FiMenu } from "react-icons/fi";
import { assets } from "../../assets/assets";
import { toast } from "react-toastify";
import "./Header.css";

const Header = ({ toggleSidebar }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Lấy thông tin user từ localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const handleLogout = () => {
    // Xóa token và user info
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Hiển thị thông báo
    toast.success("Đăng xuất thành công");

    // Redirect về trang login bằng cách reload trang
    window.location.href = "/login";
  };

  const userMenuItems = [
    {
      type: "divider",
    },
    {
      key: "logout",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", color: "#dc2626" }}>
          <FiLogOut style={{ fontSize: "16px" }} />
          <span style={{ fontWeight: 600 }}>Đăng xuất</span>
        </div>
      ),
      onClick: handleLogout,
    },
  ];

  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="mobile-toggle-btn" onClick={toggleSidebar}>
          <FiMenu size={24} />
        </button>
        <div className="header-title">
          <h1>Techzy Restaurant Admin</h1>
        </div>
      </div>

      <div className="header-actions">
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={["click"]}
          overlayClassName="user-dropdown-menu"
        >
          <div className="header-profile" style={{ cursor: "pointer" }}>
            <img
              src={assets?.profile_image || "https://via.placeholder.com/40"}
              alt="Admin"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/40";
              }}
            />
            <div className="profile-info">
              <p className="profile-name">{user?.HoTen || "Admin Manager"}</p>
              <span className="profile-role">
                {user?.TenVaiTro || "Administrator"}
              </span>
            </div>
            <FiChevronDown className="chevron-icon" />
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

export default Header;

