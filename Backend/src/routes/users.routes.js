/**
 * Routes cho Users API
 */

const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  register,
  login,
  updateUser,
  deleteUser,
} = require("../controllers/users.controller");
const { authenticate, isAdmin } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rateLimiter.middleware"); // ✅ NEW

// ✅ Public routes với rate limiting
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// Protected routes
router.get("/", authenticate, isAdmin, getAllUsers);
router.get("/:id", authenticate, getUserById);
router.put("/:id", authenticate, isAdmin, updateUser);
router.delete("/:id", authenticate, isAdmin, deleteUser);

module.exports = router;
