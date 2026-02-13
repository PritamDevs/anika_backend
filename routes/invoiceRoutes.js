const express = require("express");
const router = express.Router();

// ✅ import default exports
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
} = require("../controllers/invoiceController");

// DEBUG (optional)
console.log("DEBUG invoice routes:", {
  auth,
  authorize,
  createInvoice
});

// ROUTES
router.post("/create", auth, createInvoice);
router.get("/", auth, getAllInvoices);
router.get("/:id", auth, getInvoiceById);

router.put("/update/:id", auth, authorize("admin"), updateInvoice);
router.delete("/delete/:id", auth, authorize("admin"), deleteInvoice);

module.exports = router;
