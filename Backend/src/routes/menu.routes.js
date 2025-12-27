/**
 * Routes cho Menu API
 */

const express = require('express');
const router = express.Router();
const {
  getAllMenu,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  getBestSellers,
  getLoaiMon,
  getMenuCount
} = require('../controllers/menu.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// ✅ CRITICAL: Đặt best-sellers TRƯỚC route /:id
router.get('/best-sellers', getBestSellers);

// Public routes
router.get('/', getAllMenu);
router.get('/loaimon', getLoaiMon);
router.get('/count', getMenuCount);
router.get('/:id', getMenuById);

// Protected routes - cần xác thực và quyền admin
router.post('/', authenticate, isAdmin, upload.single('HinhAnh'), createMenu);
router.put('/:id', authenticate, isAdmin, upload.single('HinhAnh'), updateMenu);
router.delete('/:id', authenticate, isAdmin, deleteMenu);

module.exports = router;

