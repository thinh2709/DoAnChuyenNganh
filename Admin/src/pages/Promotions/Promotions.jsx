import React, { useEffect, useMemo, useState } from "react";
import "./Promotions.css";
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
  DatePicker,
  Space,
  Typography,
  Tag,
} from "antd";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import dayjs from "dayjs";

const { Text } = Typography;
const { TextArea } = Input;

const Promotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchPromotions = async () => {
    try {
      const response = await api.get("/promotions");
      setPromotions(response.data.data || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách khuyến mãi");
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await api.get("/menu");
      setMenuItems(response.data.data || []);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  useEffect(() => {
    fetchPromotions();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    if (showEditModal && selectedPromotion) {
      editForm.setFieldsValue({
        tenKM: selectedPromotion.TenKM || selectedPromotion.tenKM,
        moTa: selectedPromotion.MoTa || selectedPromotion.moTa || "",
        loaiGiamGia:
          selectedPromotion.LoaiGiamGia || selectedPromotion.loaiGiamGia,
        giaTriGiam: Number(selectedPromotion.GiaTriGiam || selectedPromotion.giaTriGiam || 0),
        ngayBatDau:
          selectedPromotion.NgayBatDau || selectedPromotion.ngayBatDau
            ? dayjs(
              selectedPromotion.NgayBatDau || selectedPromotion.ngayBatDau
            )
            : null,
        ngayKetThuc:
          selectedPromotion.NgayKetThuc || selectedPromotion.ngayKetThuc
            ? dayjs(
              selectedPromotion.NgayKetThuc || selectedPromotion.ngayKetThuc
            )
            : null,
        maApDung:
          selectedPromotion.MaApDung || selectedPromotion.maApDung || "",
      });
    }
  }, [showEditModal, selectedPromotion, editForm]);

  const closeAddModal = () => {
    setShowAddModal(false);
    addForm.resetFields();
  };

  const handleAddPromotion = async (values) => {
    try {
      await api.post("/promotions", {
        TenKM: values.tenKM,
        MoTa: values.moTa || null,
        LoaiGiamGia: values.loaiGiamGia,
        GiaTriGiam: parseFloat(values.giaTriGiam),
        NgayBatDau: values.ngayBatDau.format("YYYY-MM-DD"),
        NgayKetThuc: values.ngayKetThuc.format("YYYY-MM-DD"),
        MaApDung: values.maApDung || null,
      });
      toast.success("Thêm khuyến mãi thành công");
      fetchPromotions();
      closeAddModal();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi thêm khuyến mãi: " + errorMessage);
    }
  };

  const handleEditPromotion = async (values) => {
    if (!selectedPromotion) return;
    try {
      await api.put(
        `/promotions/${selectedPromotion.MaKM || selectedPromotion.maKM}`,
        {
          TenKM: values.tenKM,
          MoTa: values.moTa || null,
          LoaiGiamGia: values.loaiGiamGia,
          GiaTriGiam: parseFloat(values.giaTriGiam),
          NgayBatDau: values.ngayBatDau.format("YYYY-MM-DD"),
          NgayKetThuc: values.ngayKetThuc.format("YYYY-MM-DD"),
          MaApDung: values.maApDung || null,
        }
      );
      toast.success("Cập nhật khuyến mãi thành công");
      fetchPromotions();
      setShowEditModal(false);
      setSelectedPromotion(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi cập nhật khuyến mãi: " + errorMessage);
    }
  };

  const handleDeletePromotion = async () => {
    if (!selectedPromotion) return;
    try {
      await api.delete(
        `/promotions/${selectedPromotion.MaKM || selectedPromotion.maKM}`
      );
      toast.success("Xóa khuyến mãi thành công");
      fetchPromotions();
      setShowDeleteModal(false);
      setSelectedPromotion(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi xóa khuyến mãi: " + errorMessage);
    }
  };

  const getStatusTag = (promotion) => {
    const today = dayjs();
    const startDate = dayjs(promotion.NgayBatDau || promotion.ngayBatDau);
    const endDate = dayjs(promotion.NgayKetThuc || promotion.ngayKetThuc);

    if (today.isBefore(startDate)) {
      return <Tag color="blue">Sắp diễn ra</Tag>;
    } else if (today.isAfter(endDate)) {
      return <Tag color="default">Đã kết thúc</Tag>;
    } else {
      return <Tag color="green">Đang áp dụng</Tag>;
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Tên khuyến mãi",
        dataIndex: "TenKM",
        key: "TenKM",
        render: (text, record) => (
          <span className="promotion-name">{text || record.tenKM}</span>
        ),
        sorter: (a, b) =>
          (a.TenKM || a.tenKM || "").localeCompare(b.TenKM || b.tenKM || ""),
      },
      {
        title: "Loại giảm giá",
        dataIndex: "LoaiGiamGia",
        key: "LoaiGiamGia",
        render: (text, record) => {
          const type = text || record.loaiGiamGia;
          return type === "PhanTram" ? (
            <Tag color="cyan">Phần trăm</Tag>
          ) : (
            <Tag color="orange">Số tiền</Tag>
          );
        },
      },
      {
        title: "Giá trị giảm",
        dataIndex: "GiaTriGiam",
        key: "GiaTriGiam",
        render: (text, record) => {
          const value = Number(text || record.giaTriGiam) || 0; // ✅ FIX
          const type = record.LoaiGiamGia || record.loaiGiamGia;
          return type === "PhanTram"
            ? `${value}%`
            : `${Math.round(value).toLocaleString("vi-VN")} VNĐ`;
        },
      },
      {
        title: "Ngày bắt đầu",
        dataIndex: "NgayBatDau",
        key: "NgayBatDau",
        render: (text, record) => {
          const date = text || record.ngayBatDau;
          return date ? dayjs(date).format("DD/MM/YYYY") : "-";
        },
      },
      {
        title: "Ngày kết thúc",
        dataIndex: "NgayKetThuc",
        key: "NgayKetThuc",
        render: (text, record) => {
          const date = text || record.ngayKetThuc;
          return date ? dayjs(date).format("DD/MM/YYYY") : "-";
        },
      },
      {
        title: "Trạng thái",
        key: "status",
        render: (_, record) => getStatusTag(record),
      },
      {
        title: "Thao tác",
        key: "actions",
        render: (_, record) => (
          <Space>
            <Button
              icon={<FiEdit2 />}
              onClick={() => {
                setSelectedPromotion(record);
                setShowEditModal(true);
              }}
            >
              Sửa
            </Button>
            <Button
              icon={<FiTrash2 />}
              danger
              onClick={() => {
                setSelectedPromotion(record);
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
    <div className="promotions-page">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Kinh doanh & Báo cáo / Khuyến mãi</p>
          <h2>Quản lý Khuyến mãi</h2>
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
          Thêm Khuyến mãi
        </Button>
      </div>

      <div className="promotions-card">
        <Table
          columns={columns}
          dataSource={promotions}
          rowKey={(record) => record.MaKM || record.maKM}
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Add Modal */}
      <Modal
        title="Thêm khuyến mãi mới"
        open={showAddModal}
        onCancel={closeAddModal}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form
          layout="vertical"
          form={addForm}
          onFinish={handleAddPromotion}
          initialValues={{
            tenKM: "",
            moTa: "",
            loaiGiamGia: "PhanTram",
            giaTriGiam: 0,
            ngayBatDau: dayjs(),
            ngayKetThuc: dayjs().add(7, "day"),
            maApDung: "",
          }}
        >
          <Form.Item
            label="Tên khuyến mãi"
            name="tenKM"
            rules={[
              { required: true, message: "Vui lòng nhập tên khuyến mãi" },
            ]}
          >
            <Input placeholder="Nhập tên khuyến mãi" />
          </Form.Item>

          <Form.Item label="Mô tả" name="moTa">
            <TextArea placeholder="Nhập mô tả (tùy chọn)" rows={3} />
          </Form.Item>

          <Form.Item
            label="Loại giảm giá"
            name="loaiGiamGia"
            rules={[{ required: true, message: "Vui lòng chọn loại giảm giá" }]}
          >
            <Select>
              <Select.Option value="PhanTram">Phần trăm (%)</Select.Option>
              <Select.Option value="SoTien">Số tiền (VNĐ)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Giá trị giảm"
            name="giaTriGiam"
            rules={[
              { required: true, message: "Vui lòng nhập giá trị giảm" },
              {
                type: "number",
                min: 0,
                transform: (value) => Number(value),
                message: "Giá trị phải lớn hơn hoặc bằng 0",
              },
            ]}
          >
            <InputNumber
              placeholder="Nhập giá trị giảm"
              style={{ width: "100%" }}
              min={0}
              step={0.01}
            />
          </Form.Item>

          <Form.Item
            label="Ngày bắt đầu"
            name="ngayBatDau"
            rules={[{ required: true, message: "Vui lòng chọn ngày bắt đầu" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày bắt đầu"
            />
          </Form.Item>

          <Form.Item
            label="Ngày kết thúc"
            name="ngayKetThuc"
            rules={[
              { required: true, message: "Vui lòng chọn ngày kết thúc" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startDate = getFieldValue("ngayBatDau");
                  if (
                    !value ||
                    !startDate ||
                    dayjs(value).isAfter(dayjs(startDate))
                  ) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Ngày kết thúc phải sau ngày bắt đầu")
                  );
                },
              }),
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày kết thúc"
            />
          </Form.Item>

          <Form.Item label="Mã áp dụng" name="maApDung">
            <Input placeholder="Nhập mã áp dụng (tùy chọn)" />
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
        title="Chỉnh sửa khuyến mãi"
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setSelectedPromotion(null);
        }}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form layout="vertical" form={editForm} onFinish={handleEditPromotion}>
          <Form.Item
            label="Tên khuyến mãi"
            name="tenKM"
            rules={[
              { required: true, message: "Vui lòng nhập tên khuyến mãi" },
            ]}
          >
            <Input placeholder="Nhập tên khuyến mãi" />
          </Form.Item>

          <Form.Item label="Mô tả" name="moTa">
            <TextArea placeholder="Nhập mô tả (tùy chọn)" rows={3} />
          </Form.Item>

          <Form.Item
            label="Loại giảm giá"
            name="loaiGiamGia"
            rules={[{ required: true, message: "Vui lòng chọn loại giảm giá" }]}
          >
            <Select>
              <Select.Option value="PhanTram">Phần trăm (%)</Select.Option>
              <Select.Option value="SoTien">Số tiền (VNĐ)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Giá trị giảm"
            name="giaTriGiam"
            rules={[
              { required: true, message: "Vui lòng nhập giá trị giảm" },
              {
                type: "number",
                min: 0,
                message: "Giá trị phải lớn hơn hoặc bằng 0",
              },
            ]}
          >
            <InputNumber
              placeholder="Nhập giá trị giảm"
              style={{ width: "100%" }}
              min={0}
              step={0.01}
            />
          </Form.Item>

          <Form.Item
            label="Ngày bắt đầu"
            name="ngayBatDau"
            rules={[{ required: true, message: "Vui lòng chọn ngày bắt đầu" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày bắt đầu"
            />
          </Form.Item>

          <Form.Item
            label="Ngày kết thúc"
            name="ngayKetThuc"
            rules={[
              { required: true, message: "Vui lòng chọn ngày kết thúc" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startDate = getFieldValue("ngayBatDau");
                  if (
                    !value ||
                    !startDate ||
                    dayjs(value).isAfter(dayjs(startDate))
                  ) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Ngày kết thúc phải sau ngày bắt đầu")
                  );
                },
              }),
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày kết thúc"
            />
          </Form.Item>

          <Form.Item label="Mã áp dụng" name="maApDung">
            <Input placeholder="Nhập mã áp dụng (tùy chọn)" />
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
        onOk={handleDeletePromotion}
        okButtonProps={{ danger: true }}
        okText="Xóa"
        cancelText="Hủy"
      >
        <p>Bạn có chắc chắn muốn xóa khuyến mãi này không?</p>
        <Text strong>
          {selectedPromotion?.TenKM || selectedPromotion?.tenKM}
        </Text>
      </Modal>
    </div>
  );
};

export default Promotions;
