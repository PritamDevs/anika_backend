const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

router.get("/", reportController.getReports);
router.get("/monthly-chart", reportController.getMonthlyChart);


module.exports = router;
