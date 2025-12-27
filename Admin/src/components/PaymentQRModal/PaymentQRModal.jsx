import React, { useState, useEffect } from 'react';
import { Modal, Spin, Typography } from 'antd';
import { generateVietQRUrl } from '../../utils/vietqr';
import './PaymentQRModal.css';

const { Text } = Typography;

const PaymentQRModal = ({ visible, onClose, amount, orderInfo, description }) => {
    const [qrUrl, setQrUrl] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && amount) {
            setLoading(true);

            // Tạo mô tả cho chuyển khoản
            const transferDescription = description || `DH ${orderInfo?.MaDonHang || 'N/A'}`;

            // Generate QR URL
            const url = generateVietQRUrl(amount, transferDescription);
            setQrUrl(url);

            // Simulate loading (cho QR code load)
            setTimeout(() => {
                setLoading(false);
            }, 500);
        }
    }, [visible, amount, description, orderInfo]);

    const handleClose = () => {
        setQrUrl('');
        setLoading(true);
        onClose();
    };

    return (
        <Modal
            title={null}
            open={visible}
            onCancel={handleClose}
            footer={null}
            width={600}
            centered
            destroyOnClose
            className="payment-qr-modal"
        >
            <div className="qr-modal-container">
                {/* Header */}
                <div className="qr-modal-header">
                    <h2>Quét mã QR để thanh toán</h2>
                    <p className="qr-subtitle">
                        Sử dụng ứng dụng ngân hàng của bạn để quét mã QR
                    </p>
                </div>

                {/* QR Code Section */}
                <div className="qr-code-section">
                    {loading ? (
                        <div className="qr-loading">
                            <Spin size="large" tip="Đang tạo mã QR..." />
                        </div>
                    ) : (
                        <div className="qr-code-wrapper">
                            <img
                                src={qrUrl}
                                alt="QR Code thanh toán"
                                className="qr-code-image"
                                onError={(e) => {
                                    console.error('QR Code load error:', e);
                                    e.target.src = '/placeholder-qr.png';
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Bank Information */}
                <div className="bank-info-section">
                    <h3 className="bank-info-title">Thông tin chuyển khoản</h3>

                    <div className="bank-info-grid">
                        {/* Ngân hàng */}
                        <div className="bank-info-row">
                            <div className="info-label">
                                <span className="info-icon">🏦</span>
                                <span>Ngân hàng:</span>
                            </div>
                            <Text strong className="info-value">MB Bank</Text>
                        </div>

                        {/* Số tài khoản */}
                        <div className="bank-info-row">
                            <div className="info-label">
                                <span className="info-icon">💳</span>
                                <span>Số TK:</span>
                            </div>
                            <Text strong className="info-value">2506200466666</Text>
                        </div>

                        {/* Chủ tài khoản */}
                        <div className="bank-info-row">
                            <div className="info-label">
                                <span className="info-icon">👤</span>
                                <span>Chủ TK:</span>
                            </div>
                            <Text strong className="info-value">NGO TRI ANH VU</Text>
                        </div>

                        {/* Số tiền */}
                        <div className="bank-info-row">
                            <div className="info-label">
                                <span className="info-icon">💰</span>
                                <span>Số tiền:</span>
                            </div>
                            <Text strong className="info-value amount">
                                {Math.round(amount || 0).toLocaleString('vi-VN')} VND
                            </Text>
                        </div>

                        {/* Nội dung chuyển khoản */}
                        <div className="bank-info-row transfer-content">
                            <div className="info-label">
                                <span className="info-icon">💬</span>
                                <span>Nội dung:</span>
                            </div>
                            <div className="transfer-code-box">
                                <code className="transfer-code">
                                    {description || `DH ${orderInfo?.MaDonHang || 'N/A'}`}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div className="qr-warning-box">
                    <span className="warning-icon">⚠️</span>
                    <div className="warning-content">
                        <Text strong className="warning-title">Lưu ý quan trọng:</Text>
                        <ul className="warning-list">
                            <li>Vui lòng chuyển <strong>chính xác số tiền</strong> để đơn hàng được xử lý tự động</li>
                            <li>Nhập <strong>đúng nội dung</strong> chuyển khoản như trên</li>
                            <li>Đơn hàng sẽ được xác nhận sau khi chúng tôi nhận được thanh toán</li>
                        </ul>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="qr-modal-actions">
                    <button className="btn-secondary" onClick={handleClose}>
                        Đóng
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => {
                            // Copy nội dung chuyển khoản
                            const content = description || `DH ${orderInfo?.MaDonHang || 'N/A'}`;
                            navigator.clipboard.writeText(content);
                            // Optional: Show toast
                            alert('Đã copy nội dung chuyển khoản!');
                        }}
                    >
                        📋 Copy nội dung CK
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PaymentQRModal;
