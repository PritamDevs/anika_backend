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

    if (global.io) {
      global.io.to(String(req.user.id)).emit("stockUpdated"); // ← add this so frontend refreshes
    }

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

    if (global.io) {
      global.io.to(String(req.user.id)).emit("stockUpdated");
    }

    res.json(product);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
// Get All Products
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
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

    if (global.io) {
      global.io.to(String(req.user.id)).emit("stockUpdated");
    }
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

exports.getAllProductsList = async (req, res) => {
  try {
    const products = await Product.find({}, "name rate discount stockQty lowStockAlert");
    res.json({ products });
  } catch (error) {
    console.error("GET ALL PRODUCTS LIST ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};