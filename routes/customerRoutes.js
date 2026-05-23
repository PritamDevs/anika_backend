const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  createCustomer,
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
  getAllCustomersList,
} = require("../controllers/customerController");


const {
  getCustomerLedger,
  updatePreviousDue,
  recalculateCustomerLedger
} = require("../controllers/customerLedgerController");


// ADMIN + EMPLOYEE
router.post("/add", auth, createCustomer);
router.get("/", auth, getAllCustomers);
router.put("/:id", auth, updateCustomer);
router.get("/all", auth, getAllCustomersList);
router.get("/:id/ledger", getCustomerLedger);
router.post("/:id/recalculate",recalculateCustomerLedger);
router.put("/:id/previous-due",updatePreviousDue);
router.post("/:id/recalculate",recalculateCustomerLedger);

// ADMIN ONLY (OPTIONAL)
router.delete("/:id", auth, deleteCustomer);

module.exports = router;
