/**
 * Routes cho Orders API
 */

const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getTodayOrderCount,
  getTodayRevenue,
  deleteOrder,
  getRecentOrders,
  addItemsToOrder,
  getMyOrders, // ✅ NEW
} = require("../controllers/orders.controller");
const {
  authenticate,
  isEmployeeOrAdmin,
  isAdmin,
} = require("../middlewares/auth.middleware");

// ⚠️ CRITICAL: Route CỤ THỂ phải đặt TRƯỚC route động /:id

// ✅ Route cụ thể - đặt TRƯỚC cùng
router.get("/my-orders", authenticate, getMyOrders); // ✅ Đặt đầu tiên
router.get("/recent", authenticate, isAdmin, getRecentOrders);
router.get("/today/count", authenticate, isEmployeeOrAdmin, getTodayOrderCount);
router.get("/today/revenue", authenticate, isEmployeeOrAdmin, getTodayRevenue);

// ✅ Route chung
router.get("/", authenticate, isEmployeeOrAdmin, getAllOrders);
router.post("/", authenticate, createOrder);

// ✅ UPDATED: Route động với authenticate middleware (bỏ isEmployeeOrAdmin)
router.get("/:id", authenticate, getOrderById); // ✅ Cho phép user xem đơn của mình
router.put("/:id/trangthai", authenticate, isEmployeeOrAdmin, updateOrderStatus);
router.delete("/:id", authenticate, isEmployeeOrAdmin, deleteOrder);
router.post("/:id/add-items", authenticate, isAdmin, addItemsToOrder);

module.exports = router;
