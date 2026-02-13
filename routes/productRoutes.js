const express = require("express");
const router = express.Router();

const {
  addProduct,
  getProducts,
  updateStock,
  deleteProduct,
  lowStockProducts,
  updateProduct
} = require("../controllers/productController");

const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// ADMIN
router.post("/add", auth, authorize("admin"), addProduct);
router.put("/stock/:id", auth, authorize("admin"), updateStock);
router.put("/:id", updateProduct);

router.delete("/:id", auth, authorize("admin"), deleteProduct);

// ADMIN + EMPLOYEE
router.get("/", auth, getProducts);

// DASHBOARD
router.get("/low-stock", auth, authorize("admin"), lowStockProducts);

module.exports = router;
