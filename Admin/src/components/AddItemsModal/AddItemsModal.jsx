import React, { useState, useEffect } from 'react';
import { Modal, Input, Card, Button, InputNumber, Empty, Badge, Spin } from 'antd';
import { FiSearch, FiPlus, FiMinus, FiShoppingCart } from 'react-icons/fi';
import api from '../../utils/axios';
import { toast } from 'react-toastify';
import './AddItemsModal.css';

const AddItemsModal = ({ visible, onClose, orderId, orderInfo, onSuccess }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState({}); // { maMon: quantity }

  useEffect(() => {
    if (visible) {
      fetchMenuItems();
      setSelectedItems({});
      setSearchTerm('');
    }
  }, [visible]);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/menu');
      setMenuItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('Không thể tải danh sách món ăn');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (maMon, change) => {
    setSelectedItems((prev) => {
      const currentQty = prev[maMon] || 0;
      const newQty = currentQty + change;

      if (newQty <= 0) {
        const { [maMon]: removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [maMon]: newQty,
      };
    });
  };

  const getTotalSelectedItems = () => {
    return Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(selectedItems).reduce((total, [maMon, qty]) => {
      const item = menuItems.find((m) => (m.MaMon || m.maMon) === parseInt(maMon));
      if (item) {
        return total + parseFloat(item.Gia || item.gia || 0) * qty;
      }
      return total;
    }, 0);
  };

  const handleSubmit = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast.warning('Vui lòng chọn ít nhất một món');
      return;
    }

    setSubmitting(true);
    try {
      const items = Object.entries(selectedItems).map(([maMon, soLuong]) => ({
        MaMon: parseInt(maMon),
        SoLuong: soLuong,
      }));

      const response = await api.post(`/orders/${orderId}/add-items`, { items });

      toast.success(response.data.message || 'Thêm món thành công!');

      if (onSuccess) {
        onSuccess(response.data.data);
      }

      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error('Lỗi khi thêm món: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMenu = menuItems.filter((item) =>
    (item.TenMon || item.tenMon || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Gọi món thêm</div>
            <div style={{ fontSize: 14, fontWeight: 400, color: '#666' }}>
              Đơn hàng #{orderId} | {orderInfo?.khachHang?.HoTen || 'Khách hàng'}
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<FiPlus />}
          onClick={handleSubmit}
          loading={submitting}
          disabled={Object.keys(selectedItems).length === 0}
        >
          Thêm {getTotalSelectedItems()} món ({getTotalPrice().toLocaleString('vi-VN')} VNĐ)
        </Button>,
      ]}
      width={900}
      className="add-items-modal"
      destroyOnClose
    >
      <div className="add-items-content">
        {/* Search Bar */}
        <div className="add-items-search">
          <Input
            prefix={<FiSearch />}
            placeholder="Tìm kiếm món ăn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="large"
            allowClear
          />
        </div>

        {/* Selected Items Summary */}
        {Object.keys(selectedItems).length > 0 && (
          <div className="selected-items-summary">
            <Badge count={getTotalSelectedItems()} showZero>
              <FiShoppingCart size={20} />
            </Badge>
            <span style={{ marginLeft: 8 }}>
              Đã chọn <strong>{getTotalSelectedItems()}</strong> món - Tổng:{' '}
              <strong style={{ color: '#52c41a' }}>
                {getTotalPrice().toLocaleString('vi-VN')} VNĐ
              </strong>
            </span>
          </div>
        )}

        {/* Menu Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : filteredMenu.length > 0 ? (
          <div className="add-items-grid">
            {filteredMenu.map((item) => {
              const maMon = item.MaMon || item.maMon;
              const qty = selectedItems[maMon] || 0;
              const price = parseFloat(item.Gia || item.gia || 0);

              return (
                <Card
                  key={maMon}
                  hoverable
                  className={`menu-item-card ${qty > 0 ? 'active-item' : ''}`}
                  cover={
                    <div className="menu-item-image-wrapper">
                      <img
                        alt={item.TenMon || item.tenMon}
                        src={item.HinhAnh || item.hinhAnh}
                        className="menu-item-image"
                      />
                      {qty > 0 && (
                        <Badge
                          count={qty}
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            backgroundColor: '#52c41a',
                          }}
                        />
                      )}
                    </div>
                  }
                >
                  <Card.Meta
                    title={
                      <div className="menu-item-title">{item.TenMon || item.tenMon}</div>
                    }
                    description={
                      <div className="menu-item-footer">
                        {/* ✅ UPDATED: Format giá tiền đúng chuẩn */}
                        <span className="menu-item-price">
                          {price.toLocaleString('vi-VN')} VNĐ
                        </span>
                        <div className="quantity-controls">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(maMon, -1)}
                            disabled={qty === 0}
                            className="qty-btn"
                          >
                            <FiMinus />
                          </button>
                          <span className="quantity-display">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(maMon, 1)}
                            className="qty-btn"
                          >
                            <FiPlus />
                          </button>
                        </div>
                      </div>
                    }
                  />
                </Card>
              );
            })}
          </div>
        ) : (
          <Empty description="Không tìm thấy món ăn" />
        )}
      </div>
    </Modal>
  );
};

export default AddItemsModal;
