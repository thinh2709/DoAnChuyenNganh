import React from "react";
import "./Footer.css";
import { assets } from "../../assets/assets";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section brand">
          <img
            src={assets.logo}
            alt="Techzy Restaurant Logo"
            className="footer-logo"
            loading="lazy"
          />
          <p className="brand-description">
            Thưởng thức tinh hoa ẩm thực với những món ăn tuyệt vời và không
            gian phục vụ ấm cúng, tận tình.
          </p>
          <div className="social-links">
            <a
              href="https://www.facebook.com/profile.php?id=61584052081368"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <i className="bx bxl-facebook"></i>
            </a>
            <a
              href="https://www.instagram.com/_ngahvu/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <i className="bx bxl-instagram"></i>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
            >
              <i className="bx bxl-twitter"></i>
            </a>
          </div>
        </div>

        <div className="footer-section contact">
          <h3>Liên hệ với chúng tôi</h3>
          <div className="contact-info">
            <p>
              <i className="bx bx-map"></i>
              396 XLHN, Phường Tân Phú, Thủ Đức, TP.HCM
            </p>
            <p>
              <i className="bx bx-phone"></i> 0373164472
            </p>
            <p>
              <i className="bx bx-envelope"></i> anhvuu2k4@gmail.com
            </p>
          </div>
        </div>

        <div className="footer-section hours">
          <h3>Giờ mở cửa</h3>
          <div className="hours-info">
            <p>Thứ 2 - Thứ 6: 8:00 - 22:00</p>
            <p>Thứ 7 - Chủ nhật: 8:00 - 23:00</p>
          </div>
        </div>

        <div className="footer-section map">
          <h3>Bản đồ</h3>
          <div className="map-container">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15673.406204299408!2d106.78244315!3d10.8608434!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317527c3debb5aad%3A0x5fb58956eb4194d0!2zxJDhuqFpIEjhu41jIEh1dGVjaCBLaHUgRQ!5e0!3m2!1svi!2s!4v1765854494737!5m2!1svi!2s"
              width="100%"
              height="280"
              style={{ border: 0, borderRadius: '8px' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Techzy Restaurant Location"
            ></iframe>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2025 Techzy Restaurant. All rights reserved.</p>
        <div className="footer-bottom-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
