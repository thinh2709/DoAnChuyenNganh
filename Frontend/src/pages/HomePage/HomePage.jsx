import React from "react";
import { Link } from "react-router-dom";
import { FiStar, FiTruck, FiShield, FiHeadphones } from "react-icons/fi";
import "./HomePage.css";
import { assets } from "../../assets/assets";
import BestSellers from "../../components/BestSellers/BestSellers";
import MenuSection from "../../components/MenuSection/MenuSection";
import ReservationSection from "../../components/ReservationSection/ReservationSection";

const HomePage = () => {
  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Chào mừng đến với Techzy Restaurant</h1>
          <p className="hero-subtitle">
            Khám phá hương vị ẩm thực đặc biệt với những món ăn tinh tế
          </p>
          <div className="hero-buttons">
            <a href="#section-menu" className="btn btn-primary">
              Xem Thực đơn
            </a>
            <a href="#section-booking" className="btn btn-secondary">
              Đặt bàn
            </a>
          </div>
        </div>
      </section>

      {/* ✅ NEW: Best Sellers Section */}
      <BestSellers />

      {/* Menu Section */}
      <div id="section-menu">
        <MenuSection />
      </div>

      {/* Reservation Section */}
      <div id="section-booking">
        <ReservationSection />
      </div>

      {/* About Us Section */}
      <section className="about-us-section" id="about-us">
        <div className="container">
          <div className="about-us-header">
            <h2 className="section-title">Về Chúng Tôi</h2>
            <p className="section-subtitle">
              Khám phá hành trình mang hương vị nướng chuẩn vị đến với thực khách
            </p>
          </div>

          <div className="about-us-grid">
            <div className="about-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80"
                alt="Chef cooking"
                className="about-image"
              />
            </div>

            <div className="about-content">
              <span className="about-eyebrow">CÂU CHUYỆN CỦA TECHZY RESTAURANT</span>
              <h2 className="about-title">Hương vị đam mê từ ngọn lửa hồng</h2>
              <p className="about-description">
                Được thành lập từ niềm đam mê ẩm thực và sự tận tâm với nghề,
                Techzy Restaurant mang đến không gian tinh tế, nơi hội tụ những
                hương vị độc đáo từ khắp nơi trên thế giới. Mỗi món ăn là một
                câu chuyện được kể qua bàn tay tài hoa của đội ngũ đầu bếp giàu
                kinh nghiệm, sử dụng nguyên liệu tươi ngon nhất để mang lại
                trải nghiệm ẩm thực khó quên.
              </p>

              <div className="core-values-grid">
                <div className="value-item">
                  <div className="value-icon">
                    <FiStar />
                  </div>
                  <div className="value-text">
                    <h4>Chất lượng cao</h4>
                    <p>Nguyên liệu tươi ngon, chế biến cẩn thận</p>
                  </div>
                </div>

                <div className="value-item">
                  <div className="value-icon">
                    <FiTruck />
                  </div>
                  <div className="value-text">
                    <h4>Giao hàng nhanh</h4>
                    <p>Đặt online, giao tận nơi trong 30 phút</p>
                  </div>
                </div>

                <div className="value-item">
                  <div className="value-icon">
                    <FiShield />
                  </div>
                  <div className="value-text">
                    <h4>An toàn vệ sinh</h4>
                    <p>Đảm bảo vệ sinh an toàn thực phẩm</p>
                  </div>
                </div>

                <div className="value-item">
                  <div className="value-icon">
                    <FiHeadphones />
                  </div>
                  <div className="value-text">
                    <h4>Hỗ trợ 24/7</h4>
                    <p>Nhân viên chuyên nghiệp, nhiệt tình</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

