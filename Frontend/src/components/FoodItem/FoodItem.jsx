import React, { useContext, useState } from "react";
import { FiShoppingCart, FiHeart } from "react-icons/fi";
import { StoreContext } from "../../Context/StoreContext";
import { buildFileUrl } from "../../config/apiConfig"; // ✅ Import helper
import "./FoodItem.css";

const FoodItem = ({ id, name, price, image, category, isBestSeller }) => {
  const { cartItems, addToCart, removeFromCart } = useContext(StoreContext);

  const handleAddToCart = () => {
    addToCart(id);
  };

  const itemInCart = cartItems[id] > 0;

  return (
    <div className={`food-item-modern ${itemInCart ? 'in-cart' : ''}`}>
      {/* Image Container với Badges */}
      <div className="food-item-image-container">
        <img 
          src={image ? (image.startsWith("http") ? image : buildFileUrl(image)) : ""} 
          alt={name} 
          className="food-item-image" 
          onError={(e) => {
             e.target.onerror = null;
             e.target.src = "https://via.placeholder.com/150?text=No+Img";
          }}
        />

        {/* Badges Overlay - Removed favorite button */}
        <div className="food-item-badges">
          {isBestSeller && (
            <span className="badge-bestseller">
              🔥 Bán chạy
            </span>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="food-item-overlay">
          <button className="quick-add-btn" onClick={handleAddToCart}>
            <FiShoppingCart />
            <span>Thêm nhanh</span>
          </button>
        </div>
      </div>

      {/* Content - Refactored to match Best Sellers */}
      <div className="food-item-content">
        {/* Name */}
        <h3 className="food-item-name">{name}</h3>

        {/* Category Tag */}
        {category && (
          <span className="food-item-category">{category}</span>
        )}

        {/* Footer: Price + Action Button (giống Best Sellers) */}
        <div className="food-item-footer">
          <span className="food-item-price">
            {Math.round(Number(price) || 0).toLocaleString("vi-VN")} VNĐ
          </span>

          {!itemInCart ? (
            <button
              className="food-item-add-to-cart-btn"
              onClick={handleAddToCart}
            >
              Thêm
            </button>
          ) : (
            <div className="food-item-counter">
              <button
                onClick={() => removeFromCart(id)}
                className="counter-btn minus"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="counter-value">{cartItems[id]}</span>
              <button
                onClick={handleAddToCart}
                className="counter-btn plus"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodItem;
