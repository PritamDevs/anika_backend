const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getDashboardData,
  getMonthlySalesChart,
  getTopCustomers
} = require("../controllers/dashboardController");

router.get("/", authMiddleware, getDashboardData);
router.get("/monthly-sales", authMiddleware, getMonthlySalesChart);
router.get("/top-customers", authMiddleware, getTopCustomers);

module.exports = router;
