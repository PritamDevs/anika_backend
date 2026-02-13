const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");

exports.addTransaction = async (req, res) => {
  try {
    const {
      customerId,
      invoiceId,
      amount,
      paymentMode,
      type, // "payment" OR "return"
      reference
    } = req.body;

    if (!customerId || !amount || !type) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const transaction = await Payment.create({
      customerId,
      invoiceId,
      amount,
      paymentMode,
      type,
      reference
    });

    if (type === "payment") {
      // Update invoice
      if (invoiceId) {
        await Invoice.findByIdAndUpdate(invoiceId, {
          $inc: { paidAmount: amount, totalDueAmount: -amount }
        });
      }

      // Update customer
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalPaid: amount, dueAmount: -amount }
      });
    }

    if (type === "return") {
      // Reduce invoice amount
      if (invoiceId) {
        await Invoice.findByIdAndUpdate(invoiceId, {
          $inc: { totalAmount: -amount, totalDueAmount: -amount }
        });
      }

      // Reduce customer purchase + due
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalPurchase: -amount, dueAmount: -amount }
      });
    }

    res.status(201).json({
      message: "Transaction recorded successfully",
      transaction
    });

  } catch (error) {
    console.error("TRANSACTION ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { type } = req.query;

    const filter = type ? { type } : {};

    const transactions = await Payment.find(filter)
      .populate("customerId", "name")
      .populate("invoiceId", "invoiceNumber")
      .sort({ createdAt: -1 });

    res.json(transactions);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



// ➕ Add Payment / Return
exports.addPayment = async (req, res) => {
  try {
    const {
      customerId,
      invoiceId,
      gstin,
      amount,
      type,
      paymentMode,
      reference,
      date
    } = req.body;

    if (!customerId || !invoiceId || !amount || !type || !paymentMode) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const payment = await Payment.create({
      customerId,
      invoiceId,
      gstin,
      amount,
      type,
      paymentMode,
      reference,
      date
    });

    res.status(201).json(payment);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

// 📦 Get Payments
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("customerId", "name gstin")
      .populate("invoiceId", "invoiceNumber")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✏️ Update Payment
exports.updatePayment = async (req, res) => {
  try {
    const { amount, paymentMode, reference } = req.body;

    const existingPayment = await Payment.findById(req.params.id);

    if (!existingPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const oldAmount = existingPayment.amount;
    const newAmount = Number(amount);
    const difference = newAmount - oldAmount;

    const customerId = existingPayment.customerId;
    const invoiceId = existingPayment.invoiceId;
    const type = existingPayment.type;

    // 🔹 Update payment
    existingPayment.amount = newAmount;
    existingPayment.paymentMode = paymentMode;
    existingPayment.reference = reference;

    await existingPayment.save();

    // 🔹 Update invoice
    if (invoiceId) {
      if (type === "payment") {
        await Invoice.findByIdAndUpdate(invoiceId, {
          $inc: {
            paidAmount: difference,
            totalDueAmount: -difference
          }
        });
      }

      if (type === "return") {
        await Invoice.findByIdAndUpdate(invoiceId, {
          $inc: {
            totalAmount: -difference,
            totalDueAmount: -difference
          }
        });
      }
    }

    // 🔹 Update customer
    if (type === "payment") {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          totalPaid: difference,
          dueAmount: -difference
        }
      });
    }

    if (type === "return") {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          totalPurchase: -difference,
          dueAmount: -difference
        }
      });
    }

    res.json({ message: "Payment updated successfully" });

  } catch (error) {
    console.error("UPDATE PAYMENT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


