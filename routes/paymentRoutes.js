const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { addTransaction, getTransactions, addPayment,getPayments,updatePayment } = require("../controllers/paymentController");

router.post("/", auth, addTransaction);
router.get("/", auth, getTransactions);

router.post("/", addPayment);
router.get("/", getPayments);
router.put("/:id", updatePayment);


module.exports = router;
