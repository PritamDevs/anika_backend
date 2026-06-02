const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// Add Product (ADMIN)
exports.addProduct = asyncHandler(async (req, res) => {
    const { name, rate, discount, stockQty, lowStockAlert } = req.body;

    if (!name || !rate || stockQty == null) {
      throw new AppError(
        "Required fields missing",
        400
      );
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
  });

// UPDATE PRODUCT
exports.updateProduct =
  asyncHandler(async (req, res) => {
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
    if (!product) {
      throw new AppError(
        "Product not found",
        404
      );
    }
    if (global.io) {
      global.io.to(String(req.user.id)).emit("stockUpdated");
    }

    res.json(product);
  });
  
// Get All Products
exports.getProducts =asyncHandler(async (req, res) => {
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
  });
//  Update Stock 
  exports.updateStock =asyncHandler(async (req, res) => {
    const { stockQty } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stockQty },
      { new: true }
    );
    if (!product) {
      throw new AppError(
        "Product not found",
        404
      );
    }
    if (global.io) {
      global.io.to(String(req.user.id)).emit("stockUpdated");
    }

     res.json(product);
  });

//  DELETE PRODUCT (ADMIN)
exports.deleteProduct =
  asyncHandler(async (req, res) => {

    const product =
      await Product.findByIdAndDelete(
        req.params.id
      );

    if (!product) {
      throw new AppError(
        "Product not found",
        404
      );
    }

    res.json({
      message: "Product deleted"
    });

  });

// LOW STOCK PRODUCTS (DASHBOARD)
   exports.lowStockProducts =asyncHandler(async (req, res) => {
    const products = await Product.find({
      $expr: { $lte: ["$stockQty", "$lowStockAlert"] }
    });

    res.json(products);
  });

exports.getAllProductsList =
  asyncHandler(async (req, res) => {

    const products =
      await Product.find(
        {},
        "name rate discount stockQty lowStockAlert"
      )
        .sort({ name: 1 });

    res.json({ products });

  });