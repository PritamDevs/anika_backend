const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { addTransaction, getTransactions, addPayment,getPayments,updatePayment } = require("../controllers/paymentController");

// router.post("/", auth, addTransaction);
// router.get("/", auth, getTransactions);

router.post("/", auth,addPayment);
router.get("/", getPayments);
router.put("/:id", auth,updatePayment);


module.exports = router;
