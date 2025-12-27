import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { StoreContext } from "../../Context/StoreContext";
import { FiPlus, FiMinus } from "react-icons/fi";
import api from "../../utils/axios";
import { buildFileUrl } from "../../config/apiConfig"; // ✅ Import helper
import Loading from "../Loading/Loading";
import "./BestSellers.css";

const BestSellers = () => {
    const [bestSellers, setBestSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart, removeFromCart, cartItems, token, setShowLoginPopup } = useContext(StoreContext);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBestSellers();
    }, []);

    const fetchBestSellers = async () => {
        try {
            const response = await api.get("/menu/best-sellers?limit=3");
            setBestSellers(response.data.data || []);
        } catch (error) {
            console.error("Error fetching best sellers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (maMon) => {
        if (!token) {
            setShowLoginPopup(true); // ✅ FIX: Show popup instead of navigate
            return;
        }
        addToCart(maMon);
    };

    const handleIncreaseQuantity = (maMon) => {
        if (!token) {
            setShowLoginPopup(true); // ✅ FIX: Show popup instead of navigate
            return;
        }
        addToCart(maMon);
    };

    const handleDecreaseQuantity = (maMon) => {
        if (!token) {
            setShowLoginPopup(true); // ✅ FIX: Show popup instead of navigate
            return;
        }
        removeFromCart(maMon);
    };

    if (loading) {
        return <Loading message="Đang tải món bán chạy..." />;
    }

    if (bestSellers.length === 0) {
        return null;
    }

    return (
        <section className="best-sellers-section">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title">Món Ăn Được Yêu Thích Nhất</h2>
                    <p className="section-subtitle">
                        Những món ăn được khách hàng đặt nhiều nhất
                    </p>
                </div>

                <div className="best-sellers-grid">
                    {bestSellers.map((item) => (
                        <div key={item.MaMon} className="best-seller-card">
                            {/* ✅ Badge HOT */}
                            <div className="hot-badge">
                                <span>🔥 BEST SELLER</span>
                            </div>

                            <div className="card-image-wrapper">
                                <img
                                    src={item.HinhAnh ? (item.HinhAnh.startsWith("http") ? item.HinhAnh : buildFileUrl(item.HinhAnh)) : ""}
                                    alt={item.TenMon}
                                    className="card-image"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://via.placeholder.com/150?text=No+Img";
                                    }}
                                />
                            </div>

                            <div className="card-content">
                                <h3 className="card-title">{item.TenMon}</h3>
                                <span className="card-category">
                                    {item.loaiMon?.TenLoai || "Món đặc biệt"}
                                </span>
                                <div className="card-footer">
                                    <span className="card-price">
                                        {Math.round(parseFloat(item.Gia || 0)).toLocaleString("vi-VN")} VNĐ
                                    </span>

                                    {/* ✅ Toggle State: Hiển thị nút Thêm hoặc Thanh điều chỉnh */}
                                    {!cartItems[item.MaMon] || cartItems[item.MaMon] === 0 ? (
                                        // Trạng thái 1: Nút "Thêm" màu cam
                                        <button
                                            className="bg-gradient-to-r from-orange-400 to-orange-600 text-white font-bold px-6 py-2 rounded-full shadow-md hover:shadow-lg hover:from-orange-500 hover:to-orange-700 transition-all duration-300 transform hover:scale-105"
                                            onClick={() => handleAddToCart(item.MaMon)}
                                        >
                                            Thêm
                                        </button>
                                    ) : (
                                        // Trạng thái 2: Thanh điều chỉnh số lượng màu xanh lá
                                        <div className="flex items-center gap-2 bg-green-500 rounded-full p-1 shadow-md">
                                            <button
                                                className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-green-500 hover:bg-gray-100 transition-colors"
                                                onClick={() => handleDecreaseQuantity(item.MaMon)}
                                            >
                                                <FiMinus size={16} />
                                            </button>
                                            <span className="text-white font-bold mx-3 min-w-[20px] text-center">
                                                {cartItems[item.MaMon]}
                                            </span>
                                            <button
                                                className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-green-500 hover:bg-gray-100 transition-colors"
                                                onClick={() => handleIncreaseQuantity(item.MaMon)}
                                            >
                                                <FiPlus size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* ✅ REMOVED: Xóa dòng hiển thị số lượng đã bán */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BestSellers;
