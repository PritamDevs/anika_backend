const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true
    },
    gstin: {
      type: String,
      default: "",   // ✅ NOT compulsory
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ["payment", "return"],
      required: true
    },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card", "bank"],
      required: true
    },
    reference: String,
    date: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
