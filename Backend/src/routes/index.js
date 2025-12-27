/**
 * File index để tổng hợp tất cả routes
 */

const express = require("express");
const router = express.Router();

// Import route modules
const usersRoutes = require("./users.routes");
const menuRoutes = require("./menu.routes");
const ordersRoutes = require("./orders.routes");
const reservationsRoutes = require("./reservations.routes");
const tablesRoutes = require("./tables.routes");
const customersRoutes = require("./customers.routes");
const categoriesRoutes = require("./categories.routes");
const departmentsRoutes = require("./departments.routes");
const shiftsRoutes = require("./shifts.routes");
const storageRoutes = require("./storage.routes");
const suppliersRoutes = require("./suppliers.routes");
const promotionsRoutes = require("./promotions.routes");
const employeesRoutes = require("./employees.routes");
const publicRoutes = require("./public.routes");
const statisticsRoutes = require("./statistics.routes");
const workscheduleRoutes = require("./workschedule.routes"); // ✅ NEW: Import workschedule routes

// ✅ NEW: Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Mount routes
router.use("/users", usersRoutes);
router.use("/menu", menuRoutes);
router.use("/orders", ordersRoutes);
router.use("/reservations", reservationsRoutes);
router.use("/tables", tablesRoutes);
router.use("/customers", customersRoutes);
router.use("/categories", categoriesRoutes);
router.use("/departments", departmentsRoutes);
router.use("/shifts", shiftsRoutes);
router.use("/storage", storageRoutes);
router.use("/suppliers", suppliersRoutes);
router.use("/promotions", promotionsRoutes);
router.use("/employees", employeesRoutes);
router.use("/public", publicRoutes);
router.use("/statistics", statisticsRoutes);
router.use("/workschedule", workscheduleRoutes); // ✅ NEW: Mount workschedule routes

module.exports = router;
