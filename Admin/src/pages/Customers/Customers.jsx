import React, { useEffect, useMemo, useState } from "react";
import "./Customers.css";
import api from "../../utils/axios";
import { toast } from "react-toastify";
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  Space,
  Typography,
} from "antd";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";

const { Text } = Typography;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/customers");
      setCustomers(response.data.data || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách khách hàng");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (showEditModal && selectedCustomer) {
      editForm.setFieldsValue({
        hoTen: selectedCustomer.HoTen || selectedCustomer.hoTen,
        soDienThoai: selectedCustomer.SoDienThoai || selectedCustomer.soDienThoai,
        email: selectedCustomer.Email || selectedCustomer.email || "",
        diaChi: selectedCustomer.DiaChi || selectedCustomer.diaChi || "",
      });
    }
  }, [showEditModal, selectedCustomer, editForm]);

  const closeAddModal = () => {
    setShowAddModal(false);
    addForm.resetFields();
  };

  const handleAddCustomer = async (values) => {
    try {
      await api.post("/customers", {
        HoTen: values.hoTen,
        SoDienThoai: values.soDienThoai,
        Email: values.email || null,
        DiaChi: values.diaChi || "",
      });
        toast.success("Thêm khách hàng thành công");
      fetchCustomers();
      closeAddModal();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi thêm khách hàng: " + errorMessage);
    }
  };

  const handleEditCustomer = async (values) => {
    if (!selectedCustomer) return;
    try {
      await api.put(
        `/customers/${selectedCustomer.MaKhachHang}`,
        {
          HoTen: values.hoTen,
          SoDienThoai: values.soDienThoai,
          Email: values.email || null,
          DiaChi: values.diaChi || "",
        }
      );
      toast.success("Cập nhật khách hàng thành công");
      fetchCustomers();
      setShowEditModal(false);
      setSelectedCustomer(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi cập nhật khách hàng: " + errorMessage);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    try {
      await api.delete(
        `/customers/${selectedCustomer.MaKhachHang}`
      );
      toast.success("Xóa khách hàng thành công");
      fetchCustomers();
      setShowDeleteModal(false);
      setSelectedCustomer(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi xóa khách hàng: " + errorMessage);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Họ tên",
        dataIndex: "HoTen",
        key: "HoTen",
        render: (text, record) => (
          <span className="customer-name">{text || record.hoTen}</span>
        ),
        sorter: (a, b) => (a.HoTen || a.hoTen || "").localeCompare(b.HoTen || b.hoTen || ""),
      },
      {
        title: "Số điện thoại",
        dataIndex: "SoDienThoai",
        key: "SoDienThoai",
        render: (text, record) => text || record.soDienThoai,
      },
      {
        title: "Email",
        dataIndex: "Email",
        key: "Email",
        render: (text, record) => text || record.email || "-",
      },
      {
        title: "Địa chỉ",
        dataIndex: "DiaChi",
        key: "DiaChi",
        render: (text, record) => {
          const address = text || record.diaChi;
          return address ? (
            <Text ellipsis={{ tooltip: address }} style={{ maxWidth: 200 }}>
              {address}
            </Text>
          ) : (
            <Text type="secondary">Chưa có địa chỉ</Text>
          );
        },
      },
      {
        title: "Thao tác",
        key: "actions",
        render: (_, record) => (
          <Space>
            <Button
              icon={<FiEdit2 />}
              onClick={() => {
                setSelectedCustomer(record);
                setShowEditModal(true);
              }}
            >
              Sửa
            </Button>
            <Button
              icon={<FiTrash2 />}
              danger
              onClick={() => {
                setSelectedCustomer(record);
                setShowDeleteModal(true);
              }}
            >
              Xóa
            </Button>
          </Space>
        ),
      },
    ],
    []
  );

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Quản lý / Khách hàng</p>
          <h2>Quản lý Khách hàng</h2>
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
          Thêm Khách hàng
        </Button>
      </div>

      <div className="customers-card">
        <Table
          columns={columns}
          dataSource={customers}
          rowKey={(record) => record.MaKhachHang}
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Add Modal */}
      <Modal
        title="Thêm khách hàng mới"
        open={showAddModal}
        onCancel={closeAddModal}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          form={addForm}
          onFinish={handleAddCustomer}
          initialValues={{ hoTen: "", soDienThoai: "", email: "", diaChi: "" }}
        >
          <Form.Item
            label="Họ tên"
                  name="hoTen"
            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
          >
            <Input placeholder="Nhập họ tên" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
                  name="soDienThoai"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              { pattern: /^[0-9]{10,11}$/, message: "Số điện thoại không hợp lệ" },
            ]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item
            label="Email"
                  name="email"
            rules={[{ type: "email", message: "Email không hợp lệ" }]}
          >
            <Input placeholder="Nhập email (tùy chọn)" />
          </Form.Item>

          <Form.Item label="Địa chỉ" name="diaChi">
            <Input placeholder="Nhập địa chỉ (tùy chọn)" />
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
        title="Chỉnh sửa khách hàng"
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setSelectedCustomer(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" form={editForm} onFinish={handleEditCustomer}>
          <Form.Item
            label="Họ tên"
                  name="hoTen"
            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
          >
            <Input placeholder="Nhập họ tên" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
                  name="soDienThoai"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              { pattern: /^[0-9]{10,11}$/, message: "Số điện thoại không hợp lệ" },
            ]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item
            label="Email"
                  name="email"
            rules={[{ type: "email", message: "Email không hợp lệ" }]}
          >
            <Input placeholder="Nhập email (tùy chọn)" />
          </Form.Item>

          <Form.Item label="Địa chỉ" name="diaChi">
            <Input placeholder="Nhập địa chỉ (tùy chọn)" />
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
        onOk={handleDeleteCustomer}
        okButtonProps={{ danger: true }}
        okText="Xóa"
        cancelText="Hủy"
      >
        <p>Bạn có chắc chắn muốn xóa khách hàng này không?</p>
        <Text strong>
          {selectedCustomer?.HoTen || selectedCustomer?.hoTen}
        </Text>
      </Modal>
    </div>
  );
};

export default Customers;
