import React, { useEffect, useMemo, useState } from "react";
import "./Storage.css";
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
  Breadcrumb,
} from "antd";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";

const { Text } = Typography;

const Storage = () => {
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [filterSupplier, setFilterSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchMaterials = async () => {
    try {
      const response = await api.get("/storage");
      setMaterials(response.data.data || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách nguyên vật liệu");
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get("/suppliers");
      setSuppliers(response.data.data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (showEditModal && selectedMaterial) {
      editForm.setFieldsValue({
        tenNguyenVatLieu:
          selectedMaterial.TenNguyenVatLieu ||
          selectedMaterial.tenNguyenVatLieu,
        donViTinh: selectedMaterial.DonViTinh || selectedMaterial.donViTinh,
        soLuongTon:
          selectedMaterial.SoLuongTon || selectedMaterial.soLuongTon || 0,
        maNhaCungCap:
          selectedMaterial.MaNhaCungCap ||
          selectedMaterial.maNhaCungCap ||
          null,
      });
    }
  }, [showEditModal, selectedMaterial, editForm]);

  const closeAddModal = () => {
    setShowAddModal(false);
    addForm.resetFields();
  };

  const handleAddMaterial = async (values) => {
    try {
      await api.post("/storage", {
        TenNguyenVatLieu: values.tenNguyenVatLieu,
        DonViTinh: values.donViTinh,
        SoLuongTon: parseFloat(values.soLuongTon) || 0,
        MaNhaCungCap: values.maNhaCungCap || null,
      });
      toast.success("Thêm nguyên vật liệu thành công");
      fetchMaterials();
      closeAddModal();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi thêm nguyên vật liệu: " + errorMessage);
    }
  };

  const handleEditMaterial = async (values) => {
    if (!selectedMaterial) return;
    try {
      await api.put(
        `/storage/${selectedMaterial.MaNguyenVatLieu || selectedMaterial.maNguyenVatLieu
        }`,
        {
          TenNguyenVatLieu: values.tenNguyenVatLieu,
          DonViTinh: values.donViTinh,
          SoLuongTon: parseFloat(values.soLuongTon) || 0,
          MaNhaCungCap: values.maNhaCungCap || null,
        }
      );
      toast.success("Cập nhật nguyên vật liệu thành công");
      fetchMaterials();
      setShowEditModal(false);
      setSelectedMaterial(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi cập nhật nguyên vật liệu: " + errorMessage);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!selectedMaterial) return;
    try {
      await api.delete(
        `/storage/${selectedMaterial.MaNguyenVatLieu || selectedMaterial.maNguyenVatLieu
        }`
      );
      toast.success("Xóa nguyên vật liệu thành công");
      fetchMaterials();
      setShowDeleteModal(false);
      setSelectedMaterial(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error("Lỗi khi xóa nguyên vật liệu: " + errorMessage);
    }
  };

  // Filter materials
  const filteredMaterials = useMemo(() => {
    let filtered = materials;
    if (filterSupplier) {
      filtered = filtered.filter(
        (m) => (m.MaNhaCungCap || m.maNhaCungCap) === filterSupplier
      );
    }
    if (searchTerm) {
      filtered = filtered.filter((m) =>
        (m.TenNguyenVatLieu || m.tenNguyenVatLieu || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }
    if (lowStockFilter) {
      filtered = filtered.filter((m) => {
        const quantity = parseFloat(m.SoLuongTon || m.soLuongTon || 0);
        return quantity < 10;
      });
    }
    return filtered;
  }, [materials, filterSupplier, searchTerm, lowStockFilter]);

  const columns = useMemo(
    () => [
      {
        title: "Tên nguyên vật liệu",
        dataIndex: "TenNguyenVatLieu",
        key: "TenNguyenVatLieu",
        render: (text, record) => (
          <span className="material-name">
            {text || record.tenNguyenVatLieu}
          </span>
        ),
        sorter: (a, b) =>
          (a.TenNguyenVatLieu || a.tenNguyenVatLieu || "").localeCompare(
            b.TenNguyenVatLieu || b.tenNguyenVatLieu || ""
          ),
      },
      {
        title: "Đơn vị tính",
        dataIndex: "DonViTinh",
        key: "DonViTinh",
        render: (text, record) => text || record.donViTinh,
      },
      {
        title: "Số lượng tồn",
        dataIndex: "SoLuongTon",
        key: "SoLuongTon",
        render: (text, record) => {
          const quantity = Number(text || record.soLuongTon) || 0; // ✅ FIX
          return (
            <Text
              strong={quantity < 10}
              style={{ color: quantity < 10 ? "#ff4d4f" : "#1a1f3c" }}
            >
              {quantity.toLocaleString("vi-VN")}
            </Text>
          );
        },
        sorter: (a, b) =>
          Number(a.SoLuongTon || a.soLuongTon || 0) -
          Number(b.SoLuongTon || b.soLuongTon || 0), // ✅ FIX
      },
      {
        title: "Nhà cung cấp",
        key: "nhaCungCap",
        render: (_, record) => {
          const supplier = record.nhaCungCap || record.NhaCungCap;
          return supplier
            ? supplier.TenNhaCungCap || supplier.tenNhaCungCap
            : "-";
        },
        filters: suppliers.map((sup) => ({
          text: sup.TenNhaCungCap || sup.tenNhaCungCap,
          value: sup.MaNhaCungCap || sup.maNhaCungCap,
        })),
        onFilter: (value, record) =>
          (record.MaNhaCungCap || record.maNhaCungCap) === value,
      },
      {
        title: "Thao tác",
        key: "actions",
        render: (_, record) => (
          <Space>
            <Button
              icon={<FiEdit2 />}
              onClick={() => {
                setSelectedMaterial(record);
                setShowEditModal(true);
              }}
            >
              Sửa
            </Button>
            <Button
              icon={<FiTrash2 />}
              danger
              onClick={() => {
                setSelectedMaterial(record);
                setShowDeleteModal(true);
              }}
            >
              Xóa
            </Button>
          </Space>
        ),
      },
    ],
    [suppliers]
  );

  return (
    <div className="storage-page">
      <Breadcrumb
        items={[
          { title: "Dashboard" },
          { title: "Quản lý Kho" },
          { title: "Tồn kho" },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div className="page-header">
        <div>
          <p className="page-eyebrow">Quản lý Kho / Tồn kho</p>
          <h2>Quản lý Tồn kho</h2>
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
          Thêm Nguyên vật liệu
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="storage-toolbar">
        <div className="toolbar-filters">
          <Input
            placeholder="Tìm kiếm theo tên nguyên vật liệu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="Lọc theo Nhà cung cấp"
            allowClear
            value={filterSupplier}
            onChange={setFilterSupplier}
            style={{ width: 200 }}
            showSearch
            optionFilterProp="children"
          >
            {suppliers.map((supplier) => (
              <Select.Option
                key={supplier.MaNhaCungCap || supplier.maNhaCungCap}
                value={supplier.MaNhaCungCap || supplier.maNhaCungCap}
              >
                {supplier.TenNhaCungCap || supplier.tenNhaCungCap}
              </Select.Option>
            ))}
          </Select>
          <Button
            type={lowStockFilter ? "primary" : "default"}
            onClick={() => setLowStockFilter(!lowStockFilter)}
          >
            {`${lowStockFilter ? "✓ " : ""}Sắp hết hàng (< 10)`}
          </Button>
        </div>
      </div>

      <div className="storage-card">
        <Table
          columns={columns}
          dataSource={filteredMaterials}
          rowKey={(record) => record.MaNguyenVatLieu || record.maNguyenVatLieu}
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Add Modal */}
      <Modal
        title="Thêm nguyên vật liệu mới"
        open={showAddModal}
        onCancel={closeAddModal}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          form={addForm}
          onFinish={handleAddMaterial}
          initialValues={{
            tenNguyenVatLieu: "",
            donViTinh: "",
            soLuongTon: 0,
            maNhaCungCap: null,
          }}
        >
          <Form.Item
            label="Tên nguyên vật liệu"
            name="tenNguyenVatLieu"
            rules={[
              { required: true, message: "Vui lòng nhập tên nguyên vật liệu" },
            ]}
          >
            <Input placeholder="Nhập tên nguyên vật liệu" />
          </Form.Item>

          <Form.Item
            label="Đơn vị tính"
            name="donViTinh"
            rules={[{ required: true, message: "Vui lòng nhập đơn vị tính" }]}
          >
            <Input placeholder="Ví dụ: kg, lít, gói" />
          </Form.Item>

          <Form.Item
            label="Số lượng tồn"
            name="soLuongTon"
            rules={[
              { required: true, message: "Vui lòng nhập số lượng tồn" },
              {
                type: "number",
                min: 0,
                message: "Số lượng phải lớn hơn hoặc bằng 0",
              },
            ]}
          >
            <InputNumber
              placeholder="Nhập số lượng tồn"
              style={{ width: "100%" }}
              min={0}
              step={0.01}
            />
          </Form.Item>

          <Form.Item label="Nhà cung cấp" name="maNhaCungCap">
            <Select placeholder="Chọn nhà cung cấp (tùy chọn)" allowClear>
              {suppliers.map((supplier) => (
                <Select.Option
                  key={supplier.MaNhaCungCap || supplier.maNhaCungCap}
                  value={supplier.MaNhaCungCap || supplier.maNhaCungCap}
                >
                  {supplier.TenNhaCungCap || supplier.tenNhaCungCap}
                </Select.Option>
              ))}
            </Select>
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
        title="Chỉnh sửa nguyên vật liệu"
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setSelectedMaterial(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" form={editForm} onFinish={handleEditMaterial}>
          <Form.Item
            label="Tên nguyên vật liệu"
            name="tenNguyenVatLieu"
            rules={[
              { required: true, message: "Vui lòng nhập tên nguyên vật liệu" },
            ]}
          >
            <Input placeholder="Nhập tên nguyên vật liệu" />
          </Form.Item>

          <Form.Item
            label="Đơn vị tính"
            name="donViTinh"
            rules={[{ required: true, message: "Vui lòng nhập đơn vị tính" }]}
          >
            <Input placeholder="Ví dụ: kg, lít, gói" />
          </Form.Item>

          <Form.Item
            label="Số lượng tồn"
            name="soLuongTon"
            rules={[
              { required: true, message: "Vui lòng nhập số lượng tồn" },
              {
                type: "number",
                min: 0,
                message: "Số lượng phải lớn hơn hoặc bằng 0",
              },
            ]}
          >
            <InputNumber
              placeholder="Nhập số lượng tồn"
              style={{ width: "100%" }}
              min={0}
              step={0.01}
            />
          </Form.Item>

          <Form.Item label="Nhà cung cấp" name="maNhaCungCap">
            <Select placeholder="Chọn nhà cung cấp (tùy chọn)" allowClear>
              {suppliers.map((supplier) => (
                <Select.Option
                  key={supplier.MaNhaCungCap || supplier.maNhaCungCap}
                  value={supplier.MaNhaCungCap || supplier.maNhaCungCap}
                >
                  {supplier.TenNhaCungCap || supplier.tenNhaCungCap}
                </Select.Option>
              ))}
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
        onOk={handleDeleteMaterial}
        okButtonProps={{ danger: true }}
        okText="Xóa"
        cancelText="Hủy"
      >
        <p>Bạn có chắc chắn muốn xóa nguyên vật liệu này không?</p>
        <Text strong>
          {selectedMaterial?.TenNguyenVatLieu ||
            selectedMaterial?.tenNguyenVatLieu}
        </Text>
      </Modal>
    </div>
  );
};

export default Storage;
