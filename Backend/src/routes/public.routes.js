/**
 * Routes công khai (không cần authentication)
 * Dành cho khách vãng lai
 */

const express = require("express");
const router = express.Router();
const { createPublicReservation } = require("../controllers/public.controller");

/**
 * POST /api/public/dat-ban
 * Đặt bàn công khai cho khách vãng lai
 * Không cần token/login
 */
router.post("/dat-ban", createPublicReservation);

module.exports = router;
