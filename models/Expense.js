const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true
    },
    description: String,
    vendor: String,
    amount: {
      type: Number,
      required: true
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank"],
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
