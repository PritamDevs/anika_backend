const Product = require("../models/Product");

// Add Product (ADMIN)
exports.addProduct = async (req, res) => {
  try {
    const { name, rate, discount, stockQty, lowStockAlert } = req.body;

    if (!name || !rate || stockQty == null) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const product = await Product.create({
      name,
      rate,
      discount,
      stockQty,
      lowStockAlert
    });

    res.status(201).json(product);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
  try {
    const { name, rate, discount, stockQty, addStock, lowStockAlert } = req.body;

    let updateData = {
      name,
      rate,
      discount,
      lowStockAlert
    };

    if (addStock && addStock > 0) {
      updateData.$inc = { stockQty: Number(addStock) };
    } else {
      updateData.stockQty = stockQty;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(product);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
// Get All Products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

//  Update Stock
exports.updateStock = async (req, res) => {
  try {
    const { stockQty } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stockQty },
      { new: true }
    );

    res.json(product);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

//  DELETE PRODUCT (ADMIN)
exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// LOW STOCK PRODUCTS (DASHBOARD)
exports.lowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$stockQty", "$lowStockAlert"] }
    });

    res.json(products);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
