const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  createCustomer,
  getAllCustomers,
  updateCustomer,
  deleteCustomer
} = require("../controllers/customerController");

// ADMIN + EMPLOYEE
router.post("/add", auth, createCustomer);
router.get("/", auth, getAllCustomers);
router.put("/:id", auth, updateCustomer);

// ADMIN ONLY (OPTIONAL)
router.delete("/:id", auth, deleteCustomer);

module.exports = router;
