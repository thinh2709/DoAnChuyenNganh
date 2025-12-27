import React, { useState, useContext, useEffect, useRef } from "react";
import "./Navbar.css";
import { assets } from "../../assets/assets";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { StoreContext } from "../../Context/StoreContext";
import LoginPopup from "../LoginPopup/LoginPopup";
import { FiShoppingBag, FiMenu, FiX } from "react-icons/fi"; // ✅ NEW: Import icons

const Navbar = () => {
  const [menu, setMenu] = useState("Home");
  const [isFixed, setIsFixed] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // ✅ NEW: State for mobile menu
  
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalCartAmount, getCartItemsWithDetails, token, user, logout } =
    useContext(StoreContext);

  const cartItems = getCartItemsWithDetails();
  const totalAmount = getTotalCartAmount();

  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector(".header");
      if (header) {
        const headerHeight = header.offsetHeight;
        const scrollPosition = window.scrollY;
        setIsFixed(scrollPosition > headerHeight - 80);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGoHome = () => {
    if (location.pathname !== "/") {
      navigate("/");
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
    setMenu("Home");
    setMobileMenuOpen(false); // Close mobile menu
  };

  const handleScrollToSection = (sectionId, menuName) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        scrollToElement(sectionId);
      }, 100);
    } else {
      scrollToElement(sectionId);
    }
    setMenu(menuName);
    setMobileMenuOpen(false); // Close mobile menu
  };

  const scrollToElement = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      const navbarHeight = 80;
      const elementPosition =
        element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const path = location.pathname;
    if (path === "/") setMenu("Home");
    else if (path === "/menu") setMenu("Menu");
    else if (path === "/reservation") setMenu("Reservation");
  }, [location]);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate("/");
    setMobileMenuOpen(false);
  };

  const handleCartClick = () => {
    if (!token) {
      setShowLogin(true);
    } else {
      navigate("/order");
    }
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      {showLogin && <LoginPopup setShowLogin={setShowLogin} />}
      <div className={`navbar ${isScrolled ? "navbar-scrolled" : ""}`}>
        {/* Hamburger Icon for Mobile */}
        <div className="navbar-mobile-toggle" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
        </div>

        <img
          src={assets.logo}
          alt="Logo"
          className="logo"
          onClick={handleGoHome}
          style={{ cursor: "pointer" }}
        />

        {/* Desktop Menu */}
        <ul className="navbar-menu">
          <li
            onClick={handleGoHome}
            className={menu === "Home" ? "active" : ""}
          >
            Trang chủ
          </li>
          <li
            onClick={() => handleScrollToSection("about-us", "About")}
            className={menu === "About" ? "active" : ""}
          >
            Về chúng tôi
          </li>
          <li
            onClick={() => handleScrollToSection("section-menu", "Menu")}
            className={menu === "Menu" ? "active" : ""}
          >
            Thực đơn
          </li>
          <li
            onClick={() =>
              handleScrollToSection("section-booking", "Reservation")
            }
            className={menu === "Reservation" ? "active" : ""}
          >
            Đặt bàn
          </li>
        </ul>

        {/* Mobile Menu Overlay */}
        <div className={`mobile-menu-overlay ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)}></div>

        {/* Mobile Menu Sidebar */}
        <div className={`mobile-menu-sidebar ${mobileMenuOpen ? "open" : ""}`}>
          <div className="mobile-menu-header">
            <img src={assets.logo} alt="Logo" className="mobile-logo" />
            <div className="close-btn" onClick={() => setMobileMenuOpen(false)}>
              <FiX size={24} />
            </div>
          </div>
          <ul className="mobile-menu-list">
            <li
              onClick={handleGoHome}
              className={menu === "Home" ? "active" : ""}
            >
              Trang chủ
            </li>
            <li
              onClick={() => handleScrollToSection("about-us", "About")}
              className={menu === "About" ? "active" : ""}
            >
              Về chúng tôi
            </li>
            <li
              onClick={() => handleScrollToSection("section-menu", "Menu")}
              className={menu === "Menu" ? "active" : ""}
            >
              Thực đơn
            </li>
            <li
              onClick={() =>
                handleScrollToSection("section-booking", "Reservation")
              }
              className={menu === "Reservation" ? "active" : ""}
            >
              Đặt bàn
            </li>
          </ul>
        </div>

        <div className="navbar-right">
          <div className="navbar-cart" onClick={handleCartClick}>
            <img src={assets.basket_icon} alt="Cart" />
            {cartItems.length > 0 && (
              <div className="cart-count">{cartItems.length}</div>
            )}
          </div>

          {token ? (
            <div className="navbar-user" ref={dropdownRef}>
              <div
                className="user-avatar"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <img src={assets.profile_icon} alt="Profile" />
                <span className="user-name-short">
                  {user?.HoTen?.charAt(0) || "U"}
                </span>
              </div>
              {showDropdown && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <strong>{user?.HoTen || "User"}</strong>
                    <span>{user?.Email}</span>
                  </div>
                  <div className="dropdown-divider"></div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/myorders");
                    }}
                  >
                    <FiShoppingBag size={20} />
                    <span>Lịch sử mua hàng</span>
                  </div>

                  <div className="dropdown-item" onClick={handleLogout}>
                    <img src={assets.logout_icon} alt="Logout" />
                    <span>Đăng xuất</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              className="login-btn-outline"
              onClick={() => setShowLogin(true)}
            >
              <img src={assets.profile_icon} alt="Login" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
