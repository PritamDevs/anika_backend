const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware"); // ✅ ADD THIS

const {
  addProduct,
  getProducts,
  updateStock,
  deleteProduct,
  lowStockProducts,
  updateProduct,
  getAllProductsList
} = require("../controllers/productController");

// ADMIN
router.post("/add", auth, authorize("admin"), addProduct);
router.put("/stock/:id", auth, authorize("admin"), updateStock);
router.put("/:id", auth, authorize("admin"), updateProduct);
router.delete("/:id", auth, authorize("admin"), deleteProduct);

// DROPDOWN API
router.get("/all", auth, getAllProductsList);

// ADMIN + EMPLOYEE
router.get("/", auth, getProducts);

// DASHBOARD
router.get("/low-stock", auth, authorize("admin"), lowStockProducts);

module.exports = router;