import React, { useContext, useState, useMemo } from "react";
import { FiSearch, FiChevronDown } from "react-icons/fi";
import { StoreContext } from "../../Context/StoreContext";
import FoodItem from "../../components/FoodItem/FoodItem";
import LoginPopup from "../../components/LoginPopup/LoginPopup";
import "./MenuPage.css";

const MenuPage = () => {
  const { foodList, addToCart, token } = useContext(StoreContext);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [visibleCount, setVisibleCount] = useState(12);

  const categories = [
    "all",
    ...new Set(
      foodList
        .map((item) => item.loaiMon?.TenLoai || item.category)
        .filter(Boolean)
    )
  ];

  const filteredFoods = useMemo(() => {
    let result = [...foodList];

    if (selectedCategory !== "all") {
      result = result.filter((item) => {
        const itemCategory = item.loaiMon?.TenLoai || item.category || "";
        return itemCategory === selectedCategory;
      });
    }

    if (searchQuery.trim()) {
      result = result.filter((item) => {
        const itemName = (item.TenMon || item.name || "").toLowerCase();
        return itemName.includes(searchQuery.toLowerCase());
      });
    }

    switch (sortOption) {
      case "price-asc":
        result.sort((a, b) => {
          const priceA = parseFloat(a.Gia || a.price || 0);
          const priceB = parseFloat(b.Gia || b.price || 0);
          return priceA - priceB;
        });
        break;
      case "price-desc":
        result.sort((a, b) => {
          const priceA = parseFloat(a.Gia || a.price || 0);
          const priceB = parseFloat(b.Gia || b.price || 0);
          return priceB - priceA;
        });
        break;
      case "name-asc":
        result.sort((a, b) => {
          const nameA = (a.TenMon || a.name || "").toLowerCase();
          const nameB = (b.TenMon || b.name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      case "name-desc":
        result.sort((a, b) => {
          const nameA = (a.TenMon || a.name || "").toLowerCase();
          const nameB = (b.TenMon || b.name || "").toLowerCase();
          return nameB.localeCompare(nameA);
        });
        break;
      default:
        // Keep original order
        break;
    }

    return result;
  }, [foodList, selectedCategory, searchQuery, sortOption]);

  const visibleFoods = filteredFoods.slice(0, visibleCount);
  const totalProducts = filteredFoods.length;
  const remainingCount = totalProducts - visibleCount;
  const hasMore = visibleCount < totalProducts;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 12);
  };

  const handleAddToCart = (itemId) => {
    if (!token) {
      setShowLogin(true);
      return;
    }
    addToCart(itemId);
  };

  return (
    <div className="menu-page">
      {showLogin && <LoginPopup setShowLogin={setShowLogin} />}
      <div className="menu-header">
        <h1>Thực đơn</h1>
        <p>Khám phá những món ăn đặc biệt của chúng tôi</p>
      </div>

      {/* ✅ Search & Sort Toolbar - Moved above Category Tabs */}
      <div className="menu-toolbar">
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm kiếm món ăn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sort-container">
          <label htmlFor="sort-select" className="sort-label">Sắp xếp:</label>
          <select
            id="sort-select"
            className="sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="default">Mặc định</option>
            <option value="price-asc">Giá: Thấp đến Cao</option>
            <option value="price-desc">Giá: Cao đến Thấp</option>
            <option value="name-asc">Tên: A-Z</option>
            <option value="name-desc">Tên: Z-A</option>
          </select>
        </div>
      </div>

      {/* Category Filter - Moved below Toolbar */}
      <div className="category-filter">
        {categories.map((category) => (
          <button
            key={category}
            className={`category-btn ${selectedCategory === category ? "active" : ""}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category === "all" ? "Tất cả" : category}
          </button>
        ))}
      </div>

      {/* ✅ UPDATED: Food Grid với 4 món/hàng */}
      <div className="food-grid">
        {visibleFoods.length > 0 ? (
          visibleFoods.map((item) => (
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

      {/* ✅ Load More Button */}
      {hasMore && (
        <div className="load-more-container">
          <button className="load-more-btn" onClick={handleLoadMore}>
            Xem thêm {remainingCount} sản phẩm
            <FiChevronDown className="chevron-icon" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MenuPage;

