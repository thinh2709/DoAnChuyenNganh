import React, { useEffect, useMemo, useState } from "react";
import "./Tables.css";
import api from "../../utils/axios";
import { toast } from "react-toastify";
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  Tag,
  Badge,
} from "antd";
import { FiEdit2, FiTrash2, FiPlus, FiClock, FiUsers } from "react-icons/fi";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const { Text } = Typography;

const Tables = () => {
  const [tables, setTables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [bookingForm] = Form.useForm();

  // Fetch tables
  const fetchTables = async () => {
    try {
      const response = await api.get("/tables");
      setTables(response.data.data || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách bàn");
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const response = await api.get("/customers");
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const response = await api.get("/reservations");
      setBookings(response.data.data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchCustomers();
    fetchBookings();
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchTables();
      fetchBookings();
    }, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showEditModal && selectedTable) {
      editForm.setFieldsValue({
        tenBan: selectedTable.TenBan || selectedTable.tenBan,
        sucChua: selectedTable.SucChua || selectedTable.sucChua,
        trangThai: selectedTable.TrangThai || selectedTable.trangThai || 'TRONG', // ✅ Set initial status
      });
    }
  }, [showEditModal, selectedTable, editForm]);

  const closeAddModal = () => {
    setShowAddModal(false);
    addForm.resetFields();
  };

  const handleAddTable = async (values) => {
    try {
      await api.post("/tables", {
        TenBan: values.tenBan,
        SucChua: parseInt(values.sucChua),
        TrangThai: false,
      });
      toast.success("Thêm bàn thành công");
      fetchTables();
      closeAddModal();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi thêm bàn: " + errorMessage);
    }
  };

  const handleEditTable = async (values) => {
    if (!selectedTable) return;
    try {
      await api.put(`/tables/${selectedTable.MaBan || selectedTable.maBan}`, {
        TenBan: values.tenBan,
        SucChua: parseInt(values.sucChua),
        TrangThai: values.trangThai, // ✅ Send status update
      });
      toast.success("Cập nhật bàn thành công");
      fetchTables();
      setShowEditModal(false);
      setSelectedTable(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi cập nhật bàn: " + errorMessage);
    }
  };

  const handleDeleteTable = async () => {
    if (!selectedTable) return;
    try {
      await api.delete(`/tables/${selectedTable.MaBan || selectedTable.maBan}`);
      toast.success("Xóa bàn thành công");
      fetchTables();
      setShowDeleteModal(false);
      setSelectedTable(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi xóa bàn: " + errorMessage);
    }
  };

  const handleBooking = async (values) => {
    if (!selectedTable) return;

    try {
      await api.post("/reservations", {
        MaBan: selectedTable.MaBan || selectedTable.maBan,
        MaKH: values.maKH,
        ThoiGianBatDau: values.thoiGianBatDau,
        ThoiGianKetThuc: values.thoiGianKetThuc,
        SoNguoi: parseInt(values.soNguoi),
        GhiChu: values.ghiChu || "",
      });
      toast.success("Đặt bàn thành công");
      fetchTables();
      fetchBookings();
      setShowBookingModal(false);
      setSelectedTable(null);
      bookingForm.resetFields();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi đặt bàn: " + errorMessage);
    }
  };

  // Check if table is currently booked
  const isTableBooked = (tableId) => {
    const currentTime = new Date();
    return bookings.some(
      (booking) =>
        (booking.MaBan || booking.maBan) === tableId &&
        new Date(booking.ThoiGianBatDau || booking.thoiGianBatDau) <=
        currentTime &&
        new Date(booking.ThoiGianKetThuc || booking.thoiGianKetThuc) >=
        currentTime
    );
  };

  const getTableStatus = (table) => {
    // Ưu tiên trạng thái từ DB nếu là Bảo trì
    const dbStatus = table.TrangThai || table.trangThai;
    if (dbStatus === 'BAO_TRI') {
      return {
        isBooked: false,
        status: "Bảo trì",
        color: "default",
      };
    }

    // Nếu có booking, vẫn hiển thị Đã đặt
    const booked = isTableBooked(table.MaBan || table.maBan);
    if (booked) {
      return {
        isBooked: true,
        status: "Đã đặt",
        color: "red",
      };
    }

    // Map các trạng thái từ DB (chỉ 3 trạng thái)
    const statusMap = {
      'TRONG': { text: "Trống", color: "green" },
      'DAT_TRUOC': { text: "Đã Đặt", color: "orange" },
    };

    return {
      isBooked: false,
      status: statusMap[dbStatus]?.text || "Trống",
      color: statusMap[dbStatus]?.color || "green",
    };
  };

  const columns = useMemo(
    () => [
      {
        title: "Tên bàn",
        dataIndex: "TenBan",
        key: "TenBan",
        render: (text, record) => (
          <span className="table-name">{text || record.tenBan}</span>
        ),
        sorter: (a, b) =>
          (a.TenBan || a.tenBan || "").localeCompare(
            b.TenBan || b.tenBan || ""
          ),
      },
      {
        title: "Sức chứa",
        dataIndex: "SucChua",
        key: "SucChua",
        render: (capacity, record) => (
          <Space>
            <FiUsers />
            <span>{capacity || record.sucChua} người</span>
          </Space>
        ),
        sorter: (a, b) =>
          (a.SucChua || a.sucChua || 0) - (b.SucChua || b.sucChua || 0),
      },
      {
        title: "Trạng thái",
        key: "status",
        render: (_, record) => {
          const status = getTableStatus(record);
          return <Tag color={status.color}>{status.status}</Tag>;
        },
      },
      {
        title: "Thao tác",
        key: "actions",
        render: (_, record) => {
          const status = getTableStatus(record);
          return (
            <Space>

              <Button
                icon={<FiEdit2 />}
                onClick={() => {
                  setSelectedTable(record);
                  setShowEditModal(true);
                }}
              >
                Sửa
              </Button>
              <Button
                icon={<FiTrash2 />}
                danger
                onClick={() => {
                  setSelectedTable(record);
                  setShowDeleteModal(true);
                }}
              >
                Xóa
              </Button>
            </Space>
          );
        },
      },
    ],
    [bookings]
  );

  return (
    <div className="tables-page">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Quản lý bán hàng / Bàn ăn</p>
          <h2>Quản lý Bàn ăn</h2>
        </div>
        <Button
          type="primary"
          icon={<FiPlus />}
          size="large"
          onClick={() => {
            addForm.resetFields();
            setShowAddModal(true);
          }}
        >
          Thêm Bàn mới
        </Button>
      </div>

      <div className="tables-card">
        <Table
          columns={columns}
          dataSource={tables}
          rowKey={(record) => record.MaBan || record.maBan}
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Add Modal */}
      <Modal
        title="Thêm bàn mới"
        open={showAddModal}
        onCancel={closeAddModal}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          form={addForm}
          onFinish={handleAddTable}
          initialValues={{ tenBan: "", sucChua: "" }}
        >
          <Form.Item
            label="Tên bàn"
            name="tenBan"
            rules={[{ required: true, message: "Vui lòng nhập tên bàn" }]}
          >
            <Input placeholder="Nhập tên bàn" />
          </Form.Item>

          <Form.Item
            label="Sức chứa (người)"
            name="sucChua"
            rules={[
              { required: true, message: "Vui lòng nhập sức chứa" },
              { type: "number", min: 1, message: "Sức chứa phải lớn hơn 0" },
            ]}
          >
            <InputNumber
              placeholder="Nhập sức chứa"
              style={{ width: "100%" }}
              min={1}
            />
          </Form.Item>

          <div className="modal-actions">
            <Button onClick={closeAddModal}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Thêm
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Chỉnh sửa bàn"
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setSelectedTable(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" form={editForm} onFinish={handleEditTable}>
          <Form.Item
            label="Tên bàn"
            name="tenBan"
            rules={[{ required: true, message: "Vui lòng nhập tên bàn" }]}
          >
            <Input placeholder="Nhập tên bàn" />
          </Form.Item>

          <Form.Item
            label="Sức chứa (người)"
            name="sucChua"
            rules={[
              { required: true, message: "Vui lòng nhập sức chứa" },
              { type: "number", min: 1, message: "Sức chứa phải lớn hơn 0" },
            ]}
          >
            <InputNumber
              placeholder="Nhập sức chứa"
              style={{ width: "100%" }}
              min={1}
            />
          </Form.Item>

          <Form.Item
            label="Trạng thái"
            name="trangThai"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select>
              <Select.Option value="TRONG">Trống</Select.Option>
              <Select.Option value="DAT_TRUOC">Đã Đặt</Select.Option>
              <Select.Option value="BAO_TRI">Bảo trì</Select.Option>
            </Select>
          </Form.Item>

          <div className="modal-actions">
            <Button onClick={() => setShowEditModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Xác nhận xóa"
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onOk={handleDeleteTable}
        okButtonProps={{ danger: true }}
        okText="Xóa"
        cancelText="Hủy"
      >
        <p>Bạn có chắc chắn muốn xóa bàn này không?</p>
        <Text strong>{selectedTable?.TenBan || selectedTable?.tenBan}</Text>
      </Modal>

      {/* Booking Modal */}
      <Modal
        title={`Đặt bàn ${selectedTable?.TenBan || selectedTable?.tenBan}`}
        open={showBookingModal}
        onCancel={() => {
          setShowBookingModal(false);
          setSelectedTable(null);
          bookingForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form
          layout="vertical"
          form={bookingForm}
          onFinish={handleBooking}
          initialValues={{
            soNguoi: selectedTable?.SucChua || selectedTable?.sucChua || 1,
          }}
        >
          <Form.Item
            label="Khách hàng"
            name="maKH"
            rules={[{ required: true, message: "Vui lòng chọn khách hàng" }]}
          >
            <Select
              placeholder="Chọn khách hàng"
              showSearch
              optionFilterProp="children"
            >
              {customers.map((customer) => (
                <Select.Option
                  key={customer.MaKH || customer.maKhachHang}
                  value={customer.MaKH || customer.maKhachHang}
                >
                  {customer.HoTen || customer.hoTen} -{" "}
                  {customer.SoDienThoai || customer.soDienThoai}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Thời gian bắt đầu"
            name="thoiGianBatDau"
            rules={[
              { required: true, message: "Vui lòng chọn thời gian bắt đầu" },
            ]}
          >
            <Input
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
            />
          </Form.Item>

          <Form.Item
            label="Thời gian kết thúc"
            name="thoiGianKetThuc"
            rules={[
              { required: true, message: "Vui lòng chọn thời gian kết thúc" },
            ]}
          >
            <Input type="datetime-local" />
          </Form.Item>

          <Form.Item
            label="Số người"
            name="soNguoi"
            rules={[
              { required: true, message: "Vui lòng nhập số người" },
              {
                type: "number",
                min: 1,
                max: selectedTable?.SucChua || selectedTable?.sucChua || 999,
                message: `Số người phải từ 1 đến ${selectedTable?.SucChua || selectedTable?.sucChua || 999
                  }`,
              },
            ]}
          >
            <InputNumber
              placeholder="Nhập số người"
              style={{ width: "100%" }}
              min={1}
              max={selectedTable?.SucChua || selectedTable?.sucChua || 999}
            />
          </Form.Item>

          <Form.Item label="Ghi chú" name="ghiChu">
            <Input.TextArea placeholder="Nhập ghi chú (nếu có)" rows={3} />
          </Form.Item>

          <div className="modal-actions">
            <Button
              onClick={() => {
                setShowBookingModal(false);
                setSelectedTable(null);
                bookingForm.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Đặt bàn
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Tables;
