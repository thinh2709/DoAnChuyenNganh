
const BANK_CONFIG = {
  bankCode: 'MB',
  accountNumber: '2506200466666',
  accountName: 'NGO TRI ANH VU',
};

/**
 * Tạo URL VietQR
 * @param {number} amount - Số tiền
 * @param {string} orderId - Mã đơn hàng
 * @returns {string} URL ảnh QR
 */
export const generateVietQRUrl = (amount, orderId) => {
  const { bankCode, accountNumber, accountName } = BANK_CONFIG;

  const addInfo = encodeURIComponent(`Thanh toan don ${orderId}`);

  const encodedAccountName = encodeURIComponent(accountName);

  const roundedAmount = Math.round(amount);

  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact.png?amount=${roundedAmount}&addInfo=${addInfo}&accountName=${encodedAccountName}`;

  return qrUrl;
};

/**
 * Format số tiền theo định dạng Việt Nam
 * @param {number} amount - Số tiền
 * @returns {string} Số tiền đã format
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const BANK_INFO = {
  bankCode: 'MB',
  bankName: 'MB Bank',
  accountNumber: '2506200466666',
  accountName: 'NGO TRI ANH VU',
};
