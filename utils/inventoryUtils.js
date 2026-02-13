const Product = require("../models/Product");

exports.reduceStock = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      throw new Error("Product not found");
    }

    if (product.stockQty < item.qty) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    product.stockQty -= item.qty;
    await product.save();
  }
};
