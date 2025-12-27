import React from "react";
import { FiX, FiCheck, FiTruck, FiPackage, FiShoppingBag } from "react-icons/fi";
import { buildFileUrl } from "../../config/apiConfig"; // ✅ Import helper
import "./OrderDetailModal.css";

const OrderDetailModal = ({ isOpen, onClose, order, onReorder }) => {
    if (!isOpen || !order) return null;

    // ✅ Status config
    const statusConfig = {
        ChoXacNhan: { label: "Chờ xác nhận", color: "orange", step: 1 },
        DangPhucVu: { label: "Đang xử lý", color: "blue", step: 2 },
        DaThanhToan: { label: "Hoàn tất", color: "green", step: 3 },
        DaHuy: { label: "Đã hủy", color: "red", step: 0 },
    };

    const currentStatus = statusConfig[order.TrangThai] || statusConfig.ChoXacNhan;
    const currentStep = currentStatus.step;

    // ✅ Calculate totals
    const subtotal = Number(order.TongTien) || 0; // ✅ FIX
    const shippingFee = order.LoaiDon === 'GiaoDi' ? 20000 : 0;
    const discount = 0;
    const total = subtotal + shippingFee - discount;

    // ✅ Steps data
    const steps = [
        { id: 1, label: "Đặt hàng", icon: <FiShoppingBag />, completed: currentStep >= 1 },
        { id: 2, label: "Đang xử lý", icon: <FiPackage />, completed: currentStep >= 2 },
        { id: 3, label: "Hoàn tất", icon: <FiCheck />, completed: currentStep >= 3 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">
                                Chi tiết đơn hàng #{order.MaDonHang}
                            </h2>
                            <p className="text-blue-100 text-sm">
                                Ngày đặt: {new Date(order.NgayDat).toLocaleDateString("vi-VN", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                        >
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* ✅ LEFT COLUMN: Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Status Badge */}
                            <div className="flex items-center gap-4">
                                <span
                                    className={`px-4 py-2 rounded-full text-sm font-semibold ${currentStatus.color === "green"
                                        ? "bg-green-100 text-green-700"
                                        : currentStatus.color === "blue"
                                            ? "bg-blue-100 text-blue-700"
                                            : currentStatus.color === "orange"
                                                ? "bg-orange-100 text-orange-700"
                                                : "bg-red-100 text-red-700"
                                        }`}
                                >
                                    {currentStatus.label}
                                </span>
                                {order.LoaiDon === 'TaiCho' ? (
                                    <span className="px-4 py-2 rounded-full text-sm font-semibold bg-purple-100 text-purple-700">
                                        Tại chỗ
                                    </span>
                                ) : (
                                    <span className="px-4 py-2 rounded-full text-sm font-semibold bg-orange-100 text-orange-700">
                                        Giao đi
                                    </span>
                                )}
                            </div>

                            {/* ✅ Progress Stepper (Only if not cancelled) */}
                            {order.TrangThai !== 'DaHuy' && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                                    <div className="flex justify-between items-center relative">
                                        {/* Progress Line */}
                                        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10"></div>
                                        <div
                                            className="absolute top-5 left-0 h-1 bg-green-500 -z-10 transition-all duration-500"
                                            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                                        ></div>

                                        {steps.map((step, index) => (
                                            <div key={step.id} className="flex flex-col items-center relative z-10">
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step.completed
                                                        ? "bg-green-500 text-white shadow-lg scale-110"
                                                        : "bg-gray-200 text-gray-500"
                                                        }`}
                                                >
                                                    {step.icon}
                                                </div>
                                                <p
                                                    className={`mt-2 text-xs font-semibold ${step.completed ? "text-green-700" : "text-gray-500"
                                                        }`}
                                                >
                                                    {step.label}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ✅ Success Message */}
                            {order.TrangThai === 'DaThanhToan' && (
                                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                                    <h3 className="text-xl font-bold text-green-800 mb-2">
                                        Đơn hàng đã hoàn tất!
                                    </h3>
                                    <p className="text-green-700">
                                        Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!
                                    </p>
                                </div>
                            )}

                            {/* ✅ Customer Info */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">
                                    Thông tin khách hàng
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Họ tên:</span>
                                        <span className="font-semibold text-gray-900">
                                            {order.khachHang?.HoTen || "-"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Số điện thoại:</span>
                                        <span className="font-semibold text-gray-900">
                                            {order.khachHang?.SoDienThoai || "-"}
                                        </span>
                                    </div>
                                    {order.DiaChiGiaoHang && (
                                        <div className="flex justify-between items-start">
                                            <span className="text-gray-600">Địa chỉ:</span>
                                            <span className="font-semibold text-gray-900 text-right max-w-xs">
                                                {order.DiaChiGiaoHang}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ✅ Order Items */}
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                                    <h3 className="text-lg font-bold text-gray-800">
                                        Danh sách món ăn ({order.chiTietDonHang?.length || 0} món)
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-200">
                                    {(order.chiTietDonHang || []).map((item, idx) => {
                                        const itemPrice = Number(item.DonGia || item.donGia) || 0; // ✅ FIX
                                        const itemQuantity = Number(item.SoLuong || item.soLuong) || 0; // ✅ FIX
                                        const itemTotal = itemPrice * itemQuantity;

                                        return (
                                            <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={(item.monAn?.HinhAnh || item.HinhAnh) ? ((item.monAn?.HinhAnh || item.HinhAnh).startsWith("http") ? (item.monAn?.HinhAnh || item.HinhAnh) : buildFileUrl(item.monAn?.HinhAnh || item.HinhAnh)) : ""}
                                                        alt={item.monAn?.TenMon || item.TenMon}
                                                        className="w-20 h-20 rounded-lg object-cover shadow-md"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=No+Img"; }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900 text-base truncate">
                                                            {item.monAn?.TenMon || item.TenMon}
                                                        </h4>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {Math.round(itemPrice).toLocaleString("vi-VN")}₫ × {itemQuantity}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-orange-600">
                                                            {Math.round(itemTotal).toLocaleString("vi-VN")}₫
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ✅ RIGHT COLUMN: Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 space-y-6">
                                {/* Payment Summary */}
                                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                                        Thông tin thanh toán
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Tổng tiền hàng:</span>
                                            <span className="font-semibold">
                                                {Math.round(subtotal).toLocaleString("vi-VN")}₫
                                            </span>
                                        </div>
                                        {shippingFee > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-700">Phí vận chuyển:</span>
                                                <span className="font-semibold text-blue-600">
                                                    {shippingFee.toLocaleString("vi-VN")}₫
                                                </span>
                                            </div>
                                        )}
                                        {discount > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-700">Giảm giá:</span>
                                                <span className="font-semibold text-green-600">
                                                    -{discount.toLocaleString("vi-VN")}₫
                                                </span>
                                            </div>
                                        )}
                                        <div className="border-t-2 border-orange-300 pt-3 mt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold text-gray-800">
                                                    Thành tiền:
                                                </span>
                                                <span className="text-2xl font-extrabold text-red-600">
                                                    {Math.round(total).toLocaleString("vi-VN")}₫
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">
                                        Phương thức thanh toán
                                    </h3>
                                    <p className="text-base font-semibold text-blue-700">
                                        {order.LoaiDon === 'TaiCho' ? 'Tiền mặt' : 'Chuyển khoản'}
                                    </p>
                                </div>

                                {/* Reorder Button */}
                                <button
                                    onClick={() => {
                                        onReorder && onReorder(order);
                                    }}
                                    className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                                >
                                    <FiShoppingBag size={24} />
                                    <span className="text-lg">Mua lại</span>
                                </button>

                                {/* Contact Info */}
                                <div className="bg-green-50 rounded-xl p-6 border border-green-200 text-center">
                                    <p className="text-sm text-gray-700 mb-2">Cần hỗ trợ?</p>
                                    <p className="text-lg font-bold text-green-700">
                                        0373164472
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">(24/7)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;
