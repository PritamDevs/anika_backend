const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    rate: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    stockQty: {
      type: Number,
      required: true
    },
    lowStockAlert: {
      type: Number,
      default: 10
    }
  },
  { timestamps: true }
);


productSchema.virtual("isLowStock").get(function () {
  return this.stockQty <= this.lowStockAlert;
});

module.exports = mongoose.model("Product", productSchema);
