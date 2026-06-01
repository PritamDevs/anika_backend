const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      default: ""
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: false,
      default: null
    },
    gstin: {
      type: String,
      default: "",
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
    customerName: String,
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card", "bank", "advance"],
      required: true
    },
    returnedProducts: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product"
        },

        productName: String,
        qty: Number
      }
    ],

    reference: String,
    date: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);