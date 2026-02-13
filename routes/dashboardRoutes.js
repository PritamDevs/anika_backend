const express = require("express");
const router = express.Router();
const {
  getDashboardData,
  getMonthlySalesChart,
  getTopCustomers
} = require("../controllers/dashboardController");

router.get("/", getDashboardData);
router.get("/monthly-sales", getMonthlySalesChart);
router.get("/top-customers", getTopCustomers);

module.exports = router;
