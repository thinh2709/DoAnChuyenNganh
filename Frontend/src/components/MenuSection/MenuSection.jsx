import React, { useContext, useState } from "react";
import { StoreContext } from "../../Context/StoreContext";
import FoodItem from "../FoodItem/FoodItem";
import LoginPopup from "../LoginPopup/LoginPopup";
import "./MenuSection.css";

const MenuSection = () => {
    const { foodList, addToCart, token } = useContext(StoreContext);
    const [showLogin, setShowLogin] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Get unique categories
    const categories = ["all", ...new Set(foodList.map((item) => item.category))];

    // Filter foods by category
    const filteredFoods =
        selectedCategory === "all"
            ? foodList.slice(0, 8) // Hiển thị 8 món đầu tiên
            : foodList.filter((item) => item.category === selectedCategory).slice(0, 8);

    const handleAddToCart = (itemId) => {
        if (!token) {
            setShowLogin(true);
            return;
        }
        addToCart(itemId);
    };

    return (
        <section className="menu-section">
            {showLogin && <LoginPopup setShowLogin={setShowLogin} />}
            <div className="container">
                <div className="menu-section-header">
                    <h2 className="section-title">Thực Đơn Của Chúng Tôi</h2>
                    <p className="section-subtitle">
                        Khám phá những món ăn đặc biệt được chế biến từ nguyên liệu tươi ngon
                    </p>
                </div>

                {/* Category Filter */}
                <div className="category-filter">
                    {categories.map((category) => (
                        <button
                            key={category}
                            className={`category-btn ${selectedCategory === category ? "active" : ""
                                }`}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category === "all" ? "Tất cả" : category}
                        </button>
                    ))}
                </div>

                {/* Food Grid */}
                <div className="menu-grid">
                    {filteredFoods.length > 0 ? (
                        filteredFoods.map((item) => (
                            <FoodItem
                                key={item.MaMon || item._id}
                                id={item.MaMon || item._id}
                                name={item.TenMon || item.name}
                                price={Math.round(parseFloat(item.Gia || item.price || 0))}
                                image={item.HinhAnh || item.image}
                                category={item.loaiMon?.TenLoai || item.category}
                                isBestSeller={item.isBestSeller || false}
                                onAddToCart={() => handleAddToCart(item.MaMon || item._id)}
                            />
                        ))
                    ) : (
                        <p className="no-items">Không có món ăn nào</p>
                    )}
                </div>

                <div className="view-all-section">
                    <a href="/menu" className="view-all-btn">
                        Xem toàn bộ thực đơn →
                    </a>
                </div>
            </div>
        </section>
    );
};

export default MenuSection;
