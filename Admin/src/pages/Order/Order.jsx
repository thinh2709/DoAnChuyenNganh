import React, { useEffect, useMemo, useState } from "react";
import "./Order.css";
import api from "../../utils/axios";
import { toast } from "react-toastify";
import {
  Button,
  Table,
  Modal,
  Form,
  Select,
  Space,
  Typography,
  Tag,
  Tabs,
  Badge,
  Input,
  Spin,
} from "antd";
import { FiEye, FiEdit, FiPlus, FiPrinter, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { generateVietQRUrl } from "../../utils/vietqr";
import AddItemsModal from "../../components/AddItemsModal/AddItemsModal";

const { Text } = Typography;

const Order = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [promotions, setPromotions] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [finalAmount, setFinalAmount] = useState(0);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [selectedOrderForAddItems, setSelectedOrderForAddItems] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    ChoXacNhan: { label: "Chờ xác nhận", color: "orange" },
    DangChuanBi: { label: "Đang chuẩn bị", color: "gold" },
    HoanThanh: { label: "Hoàn thành", color: "green" },
    DaThanhToan: { label: "Đã thanh toán", color: "cyan" },
    DaHuy: { label: "Đã hủy", color: "red" },
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get("/orders");
      setOrders(response.data.data || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách đơn hàng");
    }
  };

  // ✅ NEW: Fetch promotions for discount
  const fetchPromotions = async () => {
    try {
      const response = await api.get("/promotions");
      const activePromotions = (response.data.data || []).filter((promotion) => {
        const today = new Date();
        const startDate = new Date(promotion.NgayBatDau);
        const endDate = new Date(promotion.NgayKetThuc);
        return today >= startDate && today <= endDate;
      });
      setPromotions(activePromotions);
    } catch (error) {
      console.error("Error fetching promotions:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPromotions();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(
        orders.filter((order) => order.TrangThai === activeTab)
      );
    }
  }, [activeTab, orders]);

  useEffect(() => {
    if (showStatusModal && selectedOrder) {
      statusForm.setFieldsValue({
        trangThai: selectedOrder.TrangThai || selectedOrder.trangThai,
      });
    }
  }, [showStatusModal, selectedOrder, statusForm]);

  // ✅ NEW: Handler mở Payment Modal
  const handleOpenPaymentModal = (order) => {
    setSelectedOrder(order);
    const orderTotal = Number(order.TongTien || 0);
    setFinalAmount(orderTotal);
    setSelectedPaymentMethod('cash');
    setSelectedPromotion(null);

    paymentForm.setFieldsValue({
      paymentMethod: 'cash',
      promotionId: null,
      note: ''
    });
    setShowPaymentModal(true);
  };

  // ✅ Handler khi thay đổi phương thức thanh toán
  const handlePaymentMethodChange = (value) => {
    setSelectedPaymentMethod(value);

    // Tạo QR code nếu chọn chuyển khoản
    if (value === 'banking' && selectedOrder) {
      const qrUrl = generateVietQRUrl(
        finalAmount,
        `DH${selectedOrder.MaDonHang}`
      );
      setQrCodeUrl(qrUrl);
    }
  };

  // ✅ Handler khi thay đổi khuyến mãi
  const handlePromotionChange = (promotionId) => {
    if (!selectedOrder) return;

    const orderTotal = Number(selectedOrder.TongTien || 0);
    let discountAmount = 0;
    let promotion = null;

    if (promotionId) {
      promotion = promotions.find(p => (p.MaKM || p.maKM) === promotionId);
      if (promotion) {
        if (promotion.LoaiGiamGia === 'PhanTram') {
          discountAmount = (orderTotal * promotion.GiaTriGiam) / 100;
        } else {
          discountAmount = Number(promotion.GiaTriGiam);
        }
      }
    }

    const newFinalAmount = Math.max(0, orderTotal - discountAmount);
    setFinalAmount(newFinalAmount);
    setSelectedPromotion(promotion);

    // Cập nhật lại QR code nếu đang chọn chuyển khoản
    if (selectedPaymentMethod === 'banking') {
      const qrUrl = generateVietQRUrl(
        newFinalAmount,
        `DH${selectedOrder.MaDonHang}`
      );
      setQrCodeUrl(qrUrl);
    }
  };

  const handleViewDetail = async (order) => {
    try {
      const response = await api.get(
        `/orders/${order.MaDonHang || order.maDonHang}`
      );
      setSelectedOrder(response.data.data);
      setShowDetailModal(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết đơn hàng");
    }
  };

  const handleUpdateStatus = async (values) => {
    if (!selectedOrder) return;
    try {
      await api.put(
        `/orders/${selectedOrder.MaDonHang || selectedOrder.maDonHang
        }/trangthai`,
        {
          TrangThai: values.trangThai,
        }
      );
      toast.success("Cập nhật trạng thái thành công");
      fetchOrders();
      setShowStatusModal(false);
      setSelectedOrder(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi cập nhật trạng thái: " + errorMessage);
    }
  };

  // ✅ NEW: Handler xử lý thanh toán
  const handleConfirmPayment = async (values) => {
    if (!selectedOrder) return;

    try {
      // Tính giảm giá nếu có
      let discountAmount = 0;
      if (values.promotionId) {
        const promotion = promotions.find(p =>
          (p.MaKM || p.maKM) === values.promotionId
        );
        if (promotion) {
          const orderTotal = Number(selectedOrder.TongTien || 0);
          if (promotion.LoaiGiamGia === 'PhanTram') {
            discountAmount = (orderTotal * promotion.GiaTriGiam) / 100;
          } else {
            discountAmount = Number(promotion.GiaTriGiam);
          }
        }
      }

      // Gọi API cập nhật trạng thái
      await api.put(
        `/orders/${selectedOrder.MaDonHang || selectedOrder.maDonHang}/trangthai`,
        {
          TrangThai: 'DaThanhToan',
          PromotionId: values.promotionId || null,
          DiscountAmount: discountAmount,
          PaymentMethod: values.paymentMethod,
          PaymentNote: values.note || ''
        }
      );

      toast.success(
        <div>
          <strong>Thanh toán thành công!</strong>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Đơn hàng #{selectedOrder.MaDonHang} đã được hoàn tất.
            {selectedOrder.MaDatBan && ' Bàn đã được giải phóng.'}
          </div>
        </div>,
        { autoClose: 3000 }
      );

      fetchOrders();
      setShowPaymentModal(false);
      setSelectedOrder(null);
      paymentForm.resetFields();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi thanh toán: " + errorMessage);
    }
  };

  // ✅ NEW: Handler cho quick status update
  const handleQuickStatusUpdate = async (order, newStatus) => {
    try {
      await api.put(
        `/orders/${order.MaDonHang || order.maDonHang}/trangthai`,
        { TrangThai: newStatus }
      );

      const statusLabels = {
        DangChuanBi: "Đang chuẩn bị",
        HoanThanh: "Hoàn thành",
        DaThanhToan: "Đã thanh toán"
      };

      toast.success(`Cập nhật trạng thái thành "${statusLabels[newStatus]}" thành công`);
      fetchOrders();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi cập nhật trạng thái: " + errorMessage);
    }
  };

  const getStatusCount = (status) => {
    if (status === "all") return orders.length;
    return orders.filter((order) => order.TrangThai === status).length;
  };

  const columns = useMemo(
    () => [
      {
        title: "Mã Đơn",
        dataIndex: "MaDonHang",
        key: "MaDonHang",
        render: (text, record) => (
          <Text strong>#{text || record.maDonHang}</Text>
        ),
        sorter: (a, b) =>
          (a.MaDonHang || a.maDonHang || 0) - (b.MaDonHang || b.maDonHang || 0),
      },
      {
        title: "Khách Hàng",
        key: "khachHang",
        render: (_, record) => {
          const customer = record.khachHang || record.KhachHang;
          return customer ? (
            <div>
              <div style={{ fontWeight: 600 }}>
                {customer.HoTen || customer.hoTen}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {customer.SoDienThoai || customer.soDienThoai}
              </Text>
            </div>
          ) : (
            "-"
          );
        },
      },
      {
        title: "Ngày Đặt",
        dataIndex: "NgayDat",
        key: "NgayDat",
        render: (text, record) => {
          const date = text || record.ngayDat;
          return date
            ? format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi })
            : "-";
        },
        sorter: (a, b) => {
          const dateA = new Date(a.NgayDat || a.ngayDat || 0);
          const dateB = new Date(b.NgayDat || b.ngayDat || 0);
          return dateA - dateB;
        },
      },
      {
        title: "Tổng Tiền",
        dataIndex: "TongTien",
        key: "TongTien",
        render: (text, record) => {
          const amount = Number(text || record.tongTien) || 0; // ✅ FIX
          return (
            <Text strong style={{ color: "#1890ff" }}>
              {Math.round(amount).toLocaleString("vi-VN")} VNĐ
            </Text>
          );
        },
        sorter: (a, b) =>
          Number(a.TongTien || a.tongTien || 0) -
          Number(b.TongTien || b.tongTien || 0), // ✅ FIX
      },
      {
        title: "Trạng Thái",
        dataIndex: "TrangThai",
        key: "TrangThai",
        render: (text, record) => {
          const status = text || record.trangThai;
          const config = statusConfig[status] || {
            label: status,
            color: "default",
          };
          return <Tag color={config.color}>{config.label}</Tag>;
        },
      },
      {
        title: "Hành động",
        key: "actions",
        render: (_, record) => {
          const status = record.TrangThai || record.trangThai;

          return (
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Button icon={<FiEye />} onClick={() => handleViewDetail(record)} block>
                Chi tiết
              </Button>

              {status === "ChoXacNhan" && (
                <Button
                  type="primary"
                  style={{ backgroundColor: "#1890ff" }}
                  onClick={() => handleQuickStatusUpdate(record, "DangChuanBi")}
                  block
                >
                  Xác nhận
                </Button>
              )}

              {status === "DangChuanBi" && (
                <Button
                  style={{
                    backgroundColor: "#ff9800",
                    borderColor: "#ff9800",
                    color: "white"
                  }}
                  onClick={() => handleQuickStatusUpdate(record, "HoanThanh")}
                  block
                >
                  Hoàn tất
                </Button>
              )}

              {status === "HoanThanh" && (
                <Button
                  style={{
                    backgroundColor: "#52c41a",
                    borderColor: "#52c41a",
                    color: "white"
                  }}
                  onClick={() => handleOpenPaymentModal(record)}
                  block
                >
                  Thanh toán
                </Button>
              )}

              {/* ✅ NEW: Nút Thêm món - Chỉ hiện khi chưa thanh toán/hủy */}
              {!["DaThanhToan", "DaHuy"].includes(status) && (
                <Button
                  icon={<FiPlus />}
                  onClick={() => handleOpenAddItemsModal(record)}
                  block
                  style={{
                    borderColor: "#52c41a",
                    color: "#52c41a"
                  }}
                >
                  Thêm món
                </Button>
              )}

              {!["DaThanhToan", "DaHuy"].includes(status) && (
                <Button
                  icon={<FiEdit />}
                  onClick={() => {
                    setSelectedOrder(record);
                    setShowStatusModal(true);
                  }}
                  block
                >
                  Sửa trạng thái
                </Button>
              )}
            </Space>
          );
        },
      },
    ],
    [promotions]
  );

  // ✅ NEW: Handler mở Add Items Modal
  const handleOpenAddItemsModal = (order) => {
    setSelectedOrderForAddItems(order);
    setShowAddItemsModal(true);
  };

  const handlePrintInvoice = () => {
    if (!selectedOrder) return;

    // Tạo nội dung in
    const printWindow = window.open('', '_blank');
    const chiTiet = selectedOrder.chiTietDonHang || selectedOrder.ChiTietDonHang || [];
    const tongTien = chiTiet.reduce((sum, item) => {
      return sum + (Number(item.ThanhTien || item.thanhTien) || 0);
    }, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn #${selectedOrder.MaDonHang || selectedOrder.maDonHang}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #f97316; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f97316; color: white; }
            .total { font-size: 18px; font-weight: bold; text-align: right; padding: 10px; }
          </style>
        </head>
        <body>
          <h1>Techzy Restaurant</h1>
          <h2>Hóa đơn #${selectedOrder.MaDonHang || selectedOrder.maDonHang}</h2>
          <p><strong>Khách hàng:</strong> ${selectedOrder.khachHang?.HoTen || '-'}</p>
          <p><strong>Ngày:</strong> ${format(new Date(selectedOrder.NgayDat || selectedOrder.ngayDat), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
          <table>
            <thead>
              <tr>
                <th>Tên món</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${chiTiet.map(item => {
      const monAn = item.monAn || item.MonAn;
      return `
                  <tr>
                    <td>${monAn?.TenMon || monAn?.tenMon || '-'}</td>
                    <td>${item.SoLuong || item.soLuong || 0}</td>
                    <td>${(item.DonGia || item.donGia || 0).toLocaleString('vi-VN')} VNĐ</td>
                    <td>${(item.ThanhTien || item.thanhTien || 0).toLocaleString('vi-VN')} VNĐ</td>
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
          <div class="total">Tổng tiền: ${Math.round(tongTien).toLocaleString('vi-VN')} VNĐ</div>
          <p style="text-align: center; margin-top: 40px;">Cảm ơn quý khách!</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ✅ NEW: Handler khi thêm món thành công
  const handleAddItemsSuccess = (updatedOrderData) => {
    toast.success('Đã thêm món vào đơn hàng thành công!');
    fetchOrders(); // Refresh danh sách
    setShowAddItemsModal(false);
    setSelectedOrderForAddItems(null);
  };

  return (
    <div className="order-page">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Quản lý Bán hàng / Đơn hàng</p>
          <h2>Quản lý Đơn hàng</h2>
        </div>
        <Button
          type="primary"
          icon={<FiPlus />}
          size="large"
          onClick={() => {
            toast.info("Chức năng tạo đơn hàng mới sẽ được phát triển sau");
          }}
        >
          Tạo Đơn Hàng Mới
        </Button>
      </div>

      <div className="order-filters">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          items={[
            {
              key: "all",
              label: (
                <span>
                  Tất cả
                  <Badge
                    count={getStatusCount("all")}
                    style={{ marginLeft: 8 }}
                    showZero
                  />
                </span>
              ),
            },
            {
              key: "ChoXacNhan",
              label: (
                <span>
                  Chờ xác nhận
                  <Badge
                    count={getStatusCount("ChoXacNhan")}
                    style={{ marginLeft: 8 }}
                    showZero
                  />
                </span>
              ),
            },
            {
              key: "DangChuanBi",
              label: (
                <span>
                  Đang chuẩn bị
                  <Badge
                    count={getStatusCount("DangChuanBi")}
                    style={{ marginLeft: 8 }}
                    showZero
                  />
                </span>
              ),
            },
            {
              key: "HoanThanh",
              label: (
                <span>
                  Hoàn thành
                  <Badge
                    count={getStatusCount("HoanThanh")}
                    style={{ marginLeft: 8 }}
                    showZero
                  />
                </span>
              ),
            },
            {
              key: "DaThanhToan",
              label: (
                <span>
                  Đã thanh toán
                  <Badge
                    count={getStatusCount("DaThanhToan")}
                    style={{ marginLeft: 8 }}
                    showZero
                  />
                </span>
              ),
            },
            {
              key: "DaHuy",
              label: (
                <span>
                  Đã hủy
                  <Badge
                    count={getStatusCount("DaHuy")}
                    style={{ marginLeft: 8 }}
                    showZero
                  />
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="order-card">
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey={(record) => record.MaDonHang || record.maDonHang}
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Detail Modal */}
      <Modal
        title={`Chi tiết đơn hàng #${selectedOrder?.MaDonHang || selectedOrder?.maDonHang
          }`}
        open={showDetailModal}
        onCancel={() => {
          setShowDetailModal(false);
          setSelectedOrder(null);
          setIsExpanded(false);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setShowDetailModal(false);
              setSelectedOrder(null);
            }}
          >
            Đóng
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<FiPrinter />}
            onClick={handlePrintInvoice}
            style={{ background: '#f97316', borderColor: '#f97316' }}
          >
            In hóa đơn
          </Button>,
        ]}
        width={900}
      >
        {selectedOrder && (
          <div className="order-detail">
            <div className="detail-section">
              <h4>Thông tin khách hàng</h4>
              <div className="detail-info">
                <p>
                  <strong>Họ tên:</strong>{" "}
                  {selectedOrder.khachHang?.HoTen ||
                    selectedOrder.KhachHang?.HoTen ||
                    selectedOrder.khachHang?.hoTen ||
                    "-"}
                </p>
                <p>
                  <strong>Số điện thoại:</strong>{" "}
                  {selectedOrder.khachHang?.SoDienThoai ||
                    selectedOrder.KhachHang?.SoDienThoai ||
                    selectedOrder.khachHang?.soDienThoai ||
                    "-"}
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  {selectedOrder.khachHang?.Email ||
                    selectedOrder.KhachHang?.Email ||
                    selectedOrder.khachHang?.email ||
                    "-"}
                </p>
              </div>
            </div>

            <div className="detail-section">
              <h4>Thông tin đơn hàng</h4>
              <div className="detail-info">
                <p>
                  <strong>Ngày đặt:</strong>{" "}
                  {selectedOrder.NgayDat || selectedOrder.ngayDat
                    ? format(
                      new Date(
                        selectedOrder.NgayDat || selectedOrder.ngayDat
                      ),
                      "dd/MM/yyyy HH:mm",
                      { locale: vi }
                    )
                    : "-"}
                </p>
                <p>
                  <strong>Trạng thái:</strong>{" "}
                  <Tag
                    color={
                      statusConfig[
                        selectedOrder.TrangThai || selectedOrder.trangThai
                      ]?.color || "default"
                    }
                  >
                    {statusConfig[
                      selectedOrder.TrangThai || selectedOrder.trangThai
                    ]?.label ||
                      selectedOrder.TrangThai ||
                      selectedOrder.trangThai}
                  </Tag>
                </p>
              </div>
            </div>

            <div className="detail-section">
              <h4>Chi tiết món ăn</h4>
              {(() => {
                const allItems = selectedOrder.chiTietDonHang || selectedOrder.ChiTietDonHang || [];
                const displayItems = isExpanded ? allItems : allItems.slice(0, 4);
                const hasMoreItems = allItems.length > 4;

                return (
                  <>
                    <Table
                      dataSource={displayItems}
                      columns={[
                        {
                          title: "Hình ảnh",
                          key: "hinhAnh",
                          width: 80,
                          render: (_, record) => {
                            const monAn = record.monAn || record.MonAn;
                            const imgUrl = monAn?.HinhAnh || monAn?.hinhAnh;
                            return (
                              <img
                                src={imgUrl || 'https://via.placeholder.com/48?text=No+Image'}
                                alt={monAn?.TenMon || monAn?.tenMon || 'Món ăn'}
                                style={{
                                  width: 48,
                                  height: 48,
                                  objectFit: 'cover',
                                  borderRadius: 8,
                                  border: '1px solid #f0f0f0'
                                }}
                              />
                            );
                          },
                        },
                        {
                          title: "Tên món",
                          key: "tenMon",
                          render: (_, record) => {
                            const monAn = record.monAn || record.MonAn;
                            return monAn?.TenMon || monAn?.tenMon || "-";
                          },
                        },
                        {
                          title: "Số lượng",
                          dataIndex: "SoLuong",
                          key: "SoLuong",
                          width: 100,
                          render: (text, record) => text || record.soLuong || 0,
                        },
                        {
                          title: "Đơn giá",
                          dataIndex: "DonGia",
                          key: "DonGia",
                          render: (text, record) => {
                            const price = text || record.donGia || 0;
                            return `${price.toLocaleString("vi-VN")} VNĐ`;
                          },
                        },
                        {
                          title: "Thành tiền",
                          dataIndex: "ThanhTien",
                          key: "ThanhTien",
                          render: (text, record) => {
                            const total = text || record.thanhTien || 0;
                            return (
                              <Text strong>{total.toLocaleString("vi-VN")} VNĐ</Text>
                            );
                          },
                        },
                      ]}
                      pagination={false}
                      summary={() => {
                        const chiTiet = selectedOrder.chiTietDonHang || selectedOrder.ChiTietDonHang || [];
                        const tongTien = chiTiet.reduce((sum, item) => {
                          const total = Number(item.ThanhTien || item.thanhTien) || 0;
                          return sum + total;
                        }, 0);

                        return (
                          <Table.Summary fixed>
                            <Table.Summary.Row style={{ borderTop: '2px solid #f0f0f0' }}>
                              <Table.Summary.Cell index={0} colSpan={4}>
                                <Text strong style={{ fontSize: 18 }}>Tổng tiền:</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={1}>
                                <Text strong style={{ color: "#f97316", fontSize: 22, fontWeight: 700 }}>
                                  {Math.round(tongTien).toLocaleString("vi-VN")} VNĐ
                                </Text>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          </Table.Summary>
                        );
                      }}
                    />
                    {hasMoreItems && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          marginTop: '12px',
                          background: '#eff6ff',
                          color: '#1e40af',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#dbeafe';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#eff6ff';
                        }}
                      >
                        {isExpanded ? (
                          <>
                            Thu gọn
                            <FiChevronUp size={16} />
                          </>
                        ) : (
                          <>
                            Xem thêm {allItems.length - 4} sản phẩm
                            <FiChevronDown size={16} />
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal
        title="Cập nhật trạng thái đơn hàng"
        open={showStatusModal}
        onCancel={() => {
          setShowStatusModal(false);
          setSelectedOrder(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" form={statusForm} onFinish={handleUpdateStatus}>
          <Form.Item
            label="Trạng thái"
            name="trangThai"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select placeholder="Chọn trạng thái">
              {Object.entries(statusConfig).map(([key, config]) => (
                <Select.Option key={key} value={key}>
                  <Tag color={config.color}>{config.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="modal-actions">
            <Button onClick={() => setShowStatusModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Cập nhật
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ✅ NEW: Payment Confirmation Modal */}
      <Modal
        title={
          <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>
            Xác nhận Thanh toán và Hoàn tất Đơn hàng #{selectedOrder?.MaDonHang}
          </div>
        }
        open={showPaymentModal}
        onCancel={() => {
          setShowPaymentModal(false);
          setSelectedOrder(null);
          paymentForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={700}
      >
        <Form
          layout="vertical"
          form={paymentForm}
          onFinish={handleConfirmPayment}
        >
          {/* Order Summary */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            padding: 20,
            borderRadius: 12,
            marginBottom: 24,
            border: '2px solid #bae6fd'
          }}>
            <h4 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
              Thông tin đơn hàng
            </h4>

            {/* Customer Info */}
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">Khách hàng:</Text>{' '}
              <Text strong>{selectedOrder?.khachHang?.HoTen}</Text>
            </div>

            {/* Table Info */}
            {selectedOrder?.MaDatBan && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">Bàn:</Text>{' '}
                <Tag color="purple">{selectedOrder?.datBan?.ban?.TenBan || 'N/A'}</Tag>
              </div>
            )}

            {/* Items List */}
            <div style={{
              background: 'white',
              padding: 12,
              borderRadius: 8,
              marginTop: 12,
              maxHeight: 200,
              overflowY: 'auto'
            }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Danh sách món ({selectedOrder?.chiTietDonHang?.length || 0} món):
              </Text>
              {(selectedOrder?.chiTietDonHang || []).map((item, idx) => {
                const price = Number(item.DonGia || 0);
                const qty = Number(item.SoLuong || 0);
                const total = price * qty;

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: idx < selectedOrder.chiTietDonHang.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}>
                    <span>
                      {item.monAn?.TenMon || item.TenMon} <Text type="secondary">x{qty}</Text>
                    </span>
                    <Text strong style={{ color: '#1890ff' }}>
                      {Math.round(total).toLocaleString('vi-VN')}₫
                    </Text>
                  </div>
                );
              })}
            </div>

            {/* Total Amount */}
            <div style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '2px solid #bae6fd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 18, fontWeight: 600 }}>Tổng tiền:</Text>
              <Text style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>
                {Math.round(Number(selectedOrder?.TongTien || 0)).toLocaleString('vi-VN')}₫
              </Text>
            </div>
          </div>

          {/* Promotion Selection */}
          <Form.Item
            label={
              <span style={{ fontWeight: 600 }}>
                Áp dụng khuyến mãi (Tùy chọn)
              </span>
            }
            name="promotionId"
          >
            <Select
              size="large"
              placeholder="Chọn khuyến mãi"
              allowClear
              onChange={handlePromotionChange}
            >
              {promotions.map((promo) => {
                const value = promo.LoaiGiamGia === 'PhanTram'
                  ? `${promo.GiaTriGiam}%`
                  : `${Math.round(promo.GiaTriGiam).toLocaleString('vi-VN')}₫`;

                return (
                  <Select.Option
                    key={promo.MaKM || promo.maKM}
                    value={promo.MaKM || promo.maKM}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{promo.TenKM || promo.tenKM}</span>
                      <Tag color="red">-{value}</Tag>
                    </div>
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>

          {/* Show discount if applied */}
          {selectedPromotion && (
            <div style={{
              background: '#fff7e6',
              border: '1px dashed #ffa940',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text>Tổng tiền gốc:</Text>
                <Text strong>{Math.round(Number(selectedOrder?.TongTien || 0)).toLocaleString('vi-VN')}₫</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text>Giảm giá:</Text>
                <Text strong style={{ color: '#ff4d4f' }}>
                  -{Math.round((Number(selectedOrder?.TongTien || 0) - finalAmount)).toLocaleString('vi-VN')}₫
                </Text>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid #ffa940'
              }}>
                <Text style={{ fontSize: 16, fontWeight: 700 }}>Thành tiền:</Text>
                <Text style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>
                  {Math.round(finalAmount).toLocaleString('vi-VN')}₫
                </Text>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>Phương thức thanh toán</span>}
            name="paymentMethod"
            rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán' }]}
          >
            <Select
              size="large"
              onChange={handlePaymentMethodChange}
            >
              <Select.Option value="cash">Tiền mặt</Select.Option>
              <Select.Option value="banking">Chuyển khoản</Select.Option>
            </Select>
          </Form.Item>

          {/* QR Code for Banking */}
          {selectedPaymentMethod === 'banking' && (
            <div style={{
              background: 'white',
              border: '2px solid #e8e8e8',
              borderRadius: 12,
              padding: 24,
              marginBottom: 16
            }}>
              <h4 style={{
                marginBottom: 24,
                fontSize: 18,
                fontWeight: 700,
                color: '#1890ff',
                textAlign: 'center'
              }}>
                Quét mã QR để thanh toán
              </h4>

              {qrCodeUrl ? (
                <div>
                  {/* QR Code Image */}
                  <div style={{
                    background: 'white',
                    padding: 16,
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 24
                  }}>
                    <img
                      src={qrCodeUrl}
                      alt="QR Code thanh toán"
                      style={{
                        width: 280,
                        height: 280,
                        objectFit: 'contain'
                      }}
                    />
                  </div>

                  {/* Bank Information */}
                  <div style={{
                    background: '#fafafa',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16
                  }}>
                    {/* Ngân hàng */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid #e8e8e8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14, color: '#666' }}>Ngân hàng:</Text>
                      </div>
                      <Text strong style={{ fontSize: 16 }}>MB Bank</Text>
                    </div>

                    {/* Số TK */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid #e8e8e8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14, color: '#666' }}>Số TK:</Text>
                      </div>
                      <Text strong style={{ fontSize: 16 }}>2506200466666</Text>
                    </div>

                    {/* Chủ TK */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid #e8e8e8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14, color: '#666' }}>Chủ TK:</Text>
                      </div>
                      <Text strong style={{ fontSize: 16 }}>NGO TRI ANH VU</Text>
                    </div>

                    {/* Số tiền */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid #e8e8e8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                        <Text style={{ fontSize: 14, color: '#666' }}>Số tiền:</Text>
                      </div>
                      <Text
                        strong
                        style={{
                          fontSize: 18,
                          color: '#52c41a',
                          fontWeight: 700
                        }}
                      >
                        {Math.round(finalAmount).toLocaleString('vi-VN')} VND
                      </Text>
                    </div>

                    {/* Nội dung chuyển khoản */}
                    <div style={{
                      padding: '12px 0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>

                        <Text style={{ fontSize: 14, color: '#666' }}>Nội dung:</Text>
                      </div>
                      <div style={{
                        background: '#fffbe6',
                        border: '1px solid #ffe58f',
                        borderRadius: 8,
                        padding: '12px 16px',
                        marginTop: 8
                      }}>
                        <Text
                          strong
                          style={{
                            fontSize: 16,
                            color: '#d46b08',
                            fontFamily: 'monospace',
                            letterSpacing: 0.5
                          }}
                        >
                          DH {selectedOrder?.MaDonHang}
                        </Text>
                      </div>
                    </div>
                  </div>

                  {/* Warning Note */}
                  <div style={{
                    background: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: 8,
                    padding: 16,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start'
                  }}>

                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 4, color: '#d46b08' }}>
                        Lưu ý:
                      </Text>
                      <Text style={{ fontSize: 13, color: '#d46b08', lineHeight: 1.6 }}>
                        Đơn hàng sẽ được xử lý sau khi chúng tôi xác nhận thanh toán thành công.
                      </Text>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin size="large" tip="Đang tạo mã QR..." />
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>Ghi chú</span>}
            name="note"
          >
            <Input.TextArea
              rows={3}
              placeholder="Nhập ghi chú về thanh toán (nếu có)..."
            />
          </Form.Item>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginTop: 24,
            justifyContent: 'flex-end'
          }}>
            <Button
              size="large"
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedOrder(null);
                paymentForm.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              style={{
                background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                borderColor: 'transparent',
                fontWeight: 600,
                height: 45,
                minWidth: 180
              }}
            >
              Xác nhận Thanh toán
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ✅ NEW: Add Items Modal */}
      <AddItemsModal
        visible={showAddItemsModal}
        onClose={() => {
          setShowAddItemsModal(false);
          setSelectedOrderForAddItems(null);
        }}
        orderId={selectedOrderForAddItems?.MaDonHang}
        orderInfo={selectedOrderForAddItems}
        onSuccess={handleAddItemsSuccess}
      />
    </div>
  );
};

export default Order;
