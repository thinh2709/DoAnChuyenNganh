import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { StoreContext } from "../../Context/StoreContext";
import { toast } from "react-toastify";
import { FiShoppingBag, FiClock, FiCheckCircle, FiXCircle, FiEye } from "react-icons/fi";
import api from "../../utils/axios";
import { buildFileUrl } from "../../config/apiConfig"; // ✅ Import helper
import OrderDetailModal from "../../components/OrderDetailModal/OrderDetailModal";
import Loading from "../../components/Loading/Loading";
import "./MyOrders.css";

const MyOrders = () => {
    const { token, user, addToCart, setCartItems } = useContext(StoreContext); // ✅ NEW: Thêm addToCart, setCartItems
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // ✅ NEW: Tab filter state

    useEffect(() => {
        if (!token) {
            toast.error("Vui lòng đăng nhập để xem lịch sử đơn hàng");
            navigate("/");
            return;
        }

        fetchOrders();
    }, [token, navigate]);

    const fetchOrders = async () => {
        try {
            setLoading(true);

            // ✅ FIXED: Correct URL without ID + Token automatically added by axios interceptor
            const response = await api.get("/orders/my-orders");

            if (response.data.success) {
                setOrders(response.data.data || []);
            }
        } catch (error) {
            console.error("Error fetching orders:", error);

            // ✅ Better error messages
            if (error.response?.status === 401) {
                toast.error("Vui lòng đăng nhập lại");
                navigate("/");
            } else if (error.response?.status === 403) {
                toast.error("Bạn không có quyền truy cập");
            } else {
                toast.error("Không thể tải lịch sử đơn hàng");
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            ChoXacNhan: {
                label: "Chờ xác nhận",
                color: "orange",
                icon: <FiClock />,
                bgClass: "bg-orange-50",
                textClass: "text-orange-700",
                borderClass: "border-orange-200"
            },
            DangChuanBi: {
                label: "Đang chuẩn bị",
                color: "blue",
                icon: <FiClock />,
                bgClass: "bg-blue-50",
                textClass: "text-blue-700",
                borderClass: "border-blue-200"
            },
            HoanThanh: {
                label: "Hoàn thành",
                color: "cyan",
                icon: <FiCheckCircle />,
                bgClass: "bg-cyan-50",
                textClass: "text-cyan-700",
                borderClass: "border-cyan-200"
            },
            DaThanhToan: {
                label: "Đã thanh toán",
                color: "green",
                icon: <FiCheckCircle />,
                bgClass: "bg-green-50",
                textClass: "text-green-700",
                borderClass: "border-green-200"
            },
            DaHuy: {
                label: "Đã hủy",
                color: "red",
                icon: <FiXCircle />,
                bgClass: "bg-red-50",
                textClass: "text-red-700",
                borderClass: "border-red-200"
            },
        };
        return configs[status] || configs.ChoXacNhan;
    };

    // ✅ UPDATED: Handle View Detail
    const handleViewDetail = async (orderId) => {
        try {
            // ✅ CRITICAL: Kiểm tra token trước khi gọi API
            if (!token) {
                toast.error("Vui lòng đăng nhập lại");
                navigate("/");
                return;
            }

            console.log("🔍 Fetching order detail:", {
                orderId,
                hasToken: !!token,
                tokenPreview: token ? `${token.substring(0, 20)}...` : null,
            });

            // ✅ FIXED: Gọi API với token (axios interceptor sẽ tự thêm)
            const response = await api.get(`/orders/${orderId}`);

            console.log("✅ Order detail response:", response.data);

            if (response.data.success) {
                setSelectedOrderDetail(response.data.data);
                setShowDetailModal(true);
            } else {
                toast.error(response.data.message || "Không thể tải chi tiết đơn hàng");
            }
        } catch (error) {
            console.error("❌ Error fetching order detail:", {
                orderId,
                status: error.response?.status,
                message: error.response?.data?.message,
                error: error.message,
            });

            // ✅ Better error handling
            if (error.response?.status === 403) {
                toast.error("Bạn không có quyền truy cập đơn hàng này");
            } else if (error.response?.status === 401) {
                toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại");
                navigate("/");
            } else if (error.response?.status === 404) {
                toast.error("Không tìm thấy đơn hàng");
            } else {
                toast.error(
                    error.response?.data?.message || "Không thể tải chi tiết đơn hàng"
                );
            }
        }
    };

    // ✅ Handle Reorder
    const handleReorder = async (order) => {
        if (!order || !order.chiTietDonHang || order.chiTietDonHang.length === 0) {
            toast.error("Đơn hàng không có món ăn để thêm vào giỏ");
            return;
        }

        try {
            // ✅ Đếm số món để hiển thị
            let totalItemsAdded = 0;

            // ✅ Lặp qua từng món trong đơn hàng
            for (const item of order.chiTietDonHang) {
                const maMon = item.monAn?.MaMon || item.MaMon;
                const soLuong = parseInt(item.SoLuong || item.soLuong || 1);

                // ✅ Thêm món vào giỏ hàng với số lượng đúng
                for (let i = 0; i < soLuong; i++) {
                    addToCart(maMon);
                }

                totalItemsAdded += soLuong;
            }

            // ✅ Đóng modal nếu đang mở
            setShowDetailModal(false);

            // ✅ Hiển thị thông báo thành công
            toast.success(
                <div>
                    <strong>Đã thêm {totalItemsAdded} món vào giỏ hàng!</strong>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                        Đang chuyển sang trang thanh toán...
                    </div>
                </div>,
                { autoClose: 2000 }
            );

            // ✅ Chuyển hướng sang trang đặt hàng sau 1 giây
            setTimeout(() => {
                navigate("/order");
            }, 1000);
        } catch (error) {
            console.error("Error reordering:", error);
            toast.error("Có lỗi xảy ra khi thêm món vào giỏ hàng");
        }
    };

    // ✅ FIXED: Hàm lọc đơn hàng theo tab (cập nhật đúng trạng thái từ backend)
    const filteredOrders = orders.filter(order => {
        if (activeTab === 'all') return true;
        if (activeTab === 'ChoXacNhan') return order.TrangThai === 'ChoXacNhan';
        if (activeTab === 'DangChuanBi') return order.TrangThai === 'DangChuanBi';
        if (activeTab === 'HoanThanh') return order.TrangThai === 'HoanThanh';
        if (activeTab === 'DaThanhToan') return order.TrangThai === 'DaThanhToan';
        if (activeTab === 'DaHuy') return order.TrangThai === 'DaHuy';
        return true;
    });

    // ✅ FIXED: Tabs configuration (cập nhật đúng trạng thái từ backend)
    const tabs = [
        { id: 'all', label: 'Tất cả', count: orders.length },
        { id: 'ChoXacNhan', label: 'Chờ xác nhận', count: orders.filter(o => o.TrangThai === 'ChoXacNhan').length },
        { id: 'DangChuanBi', label: 'Đang chuẩn bị', count: orders.filter(o => o.TrangThai === 'DangChuanBi').length },
        { id: 'HoanThanh', label: 'Hoàn thành', count: orders.filter(o => o.TrangThai === 'HoanThanh').length },
        { id: 'DaThanhToan', label: 'Đã thanh toán', count: orders.filter(o => o.TrangThai === 'DaThanhToan').length },
        { id: 'DaHuy', label: 'Đã hủy', count: orders.filter(o => o.TrangThai === 'DaHuy').length },
    ];

    if (loading) {
        return <Loading message="Đang tải lịch sử đơn hàng..." />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
                            Lịch sử mua hàng
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Xem lại các đơn hàng bạn đã đặt tại Techzy Restaurant
                    </p>
                </div>

                {/* ✅ NEW: Sticky Tab Filter */}
                <div className="sticky top-0 z-10 bg-white shadow-md rounded-lg mb-6 overflow-hidden">
                    <div className="overflow-x-auto scrollbar-hide">
                        <div className="flex min-w-max">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 border-b-3 whitespace-nowrap ${activeTab === tab.id
                                        ? 'text-orange-600 border-b-3 border-orange-500 bg-orange-50'
                                        : 'text-gray-500 border-b-3 border-transparent hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        {tab.label}
                                        {tab.count > 0 && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id
                                                ? 'bg-orange-600 text-white'
                                                : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
                        <p className="mt-4 text-gray-600 font-medium">Đang tải...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
                        <FiShoppingBag size={80} className="mx-auto text-gray-300 mb-6" />
                        <h2 className="text-3xl font-bold text-gray-800 mb-3">
                            {activeTab === 'all' ? 'Chưa có đơn hàng nào' : `Không có đơn hàng "${tabs.find(t => t.id === activeTab)?.label}"`}
                        </h2>
                        <p className="text-gray-600 mb-8 text-lg">
                            {activeTab === 'all'
                                ? 'Hãy đặt món ngay để trải nghiệm dịch vụ của chúng tôi!'
                                : 'Thử chọn tab khác hoặc đặt món mới.'}
                        </p>
                        {activeTab === 'all' && (
                            <button
                                onClick={() => navigate("/menu")}
                                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                                Đặt món ngay
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredOrders.map((order) => {
                            const statusConfig = getStatusConfig(order.TrangThai);
                            const total = parseFloat(order.TongTien || 0);

                            return (
                                <div
                                    key={order.MaDonHang}
                                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
                                >
                                    {/* Compact Header */}
                                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 border-b border-indigo-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-extrabold text-gray-900">
                                                    #{order.MaDonHang}
                                                </span>
                                                <span className="text-gray-400">•</span>
                                                <span className="text-sm text-gray-500">
                                                    {new Date(order.NgayDat).toLocaleString("vi-VN", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${statusConfig.borderClass} ${statusConfig.bgClass} ${statusConfig.textClass} font-semibold`}>
                                                {statusConfig.icon}
                                                <span>{statusConfig.label}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compact Body */}
                                    <div className="p-4">
                                        {/* Item - Chỉ hiển thị 1 sản phẩm đầu tiên */}
                                        <div className="mb-3">
                                            {(order.chiTietDonHang || []).slice(0, 1).map((item, idx) => {
                                                const itemPrice = Number(item.DonGia || item.donGia) || 0;
                                                const itemQuantity = Number(item.SoLuong || item.soLuong) || 0;
                                                const itemTotal = itemPrice * itemQuantity;

                                                return (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-3"
                                                    >
                                                        <img
                                                            src={(item.monAn?.HinhAnh || item.HinhAnh) ? ((item.monAn?.HinhAnh || item.HinhAnh).startsWith("http") ? (item.monAn?.HinhAnh || item.HinhAnh) : buildFileUrl(item.monAn?.HinhAnh || item.HinhAnh)) : ""}
                                                            alt={item.monAn?.TenMon || item.TenMon}
                                                            className="w-16 h-16 rounded-lg object-cover"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=No+Img"; }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-gray-900 text-sm truncate">
                                                                {item.monAn?.TenMon || item.TenMon}
                                                            </h3>
                                                            <p className="text-xs text-indigo-600 font-semibold">
                                                                x{itemQuantity}
                                                            </p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <p className="text-base font-bold text-orange-600">
                                                                {Math.round(itemTotal).toLocaleString("vi-VN")}₫
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Compact Footer - Flex Row Layout */}
                                        <div className="flex items-center justify-between border-t border-gray-100 pt-3 gap-4">
                                            {/* Bên trái: Text "Và [x] sản phẩm khác..." */}
                                            <div className="flex-shrink-0">
                                                {order.chiTietDonHang?.length > 1 ? (
                                                    <p className="text-xs text-gray-500 italic">
                                                        Và {order.chiTietDonHang.length - 1} sản phẩm khác...
                                                    </p>
                                                ) : (
                                                    <span></span>
                                                )}
                                            </div>

                                            {/* Bên phải: Tổng tiền + Buttons */}
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {/* Tổng tiền */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-600">Tổng:</span>
                                                    <span className="text-lg font-extrabold text-red-600">
                                                        {Math.round(Number(total)).toLocaleString("vi-VN")}₫
                                                    </span>
                                                </div>

                                                {/* Vách ngăn */}
                                                <div className="h-8 w-px bg-gray-300"></div>

                                                {/* Action Buttons - Compact */}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleViewDetail(order.MaDonHang)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
                                                    >
                                                        <FiEye size={14} />
                                                        <span>Chi tiết</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleReorder(order)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-semibold hover:from-orange-600 hover:to-red-600 transition-all"
                                                    >
                                                        <FiShoppingBag size={14} />
                                                        <span>Mua lại</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ✅ NEW: Order Detail Modal */}
            <OrderDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedOrderDetail(null);
                }}
                order={selectedOrderDetail}
                onReorder={handleReorder}
            />
        </div>
    );
};

export default MyOrders;
