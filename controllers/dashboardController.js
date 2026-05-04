const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Payment = require("../models/Payment");

const mongoose = require("mongoose");

exports.getDashboardData = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // ✅ Total Sales this month
    const salesAgg = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          createdBy: userId
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalSales = salesAgg[0]?.total || 0;

    // ✅ Outstanding this month
    const outstandingAgg = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          createdBy: userId
        }
      },
      { $group: { _id: null, total: { $sum: "$totalDueAmount" } } }
    ]);
    const outstanding = outstandingAgg[0]?.total || 0;

    // ✅ Total Customers (overall, unchanged)
    const totalCustomers = await Customer.countDocuments({
      isActive: true,
      user: req.user.id
    });

    // ✅ Open invoices this month
    const openInvoices = await Invoice.countDocuments({
      totalDueAmount: { $gt: 0 },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      createdBy: req.user.id
    });

    // ✅ Low stock (unchanged)
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$stockQty", "$lowStockAlert"] },
      stockQty: { $gte: 0 }
    }).select("name rate discount stockQty");

    res.status(200).json({
      totalSales,
      outstanding,
      totalCustomers,
      openInvoices,
      lowStockProducts
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
exports.getMonthlySalesChart = async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();

    const sales = await Invoice.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$totalAmount" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    if (!sales || sales.length === 0)
    {
      return res.status(200).json([]);
    }
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const formattedData = months.map((month, index) => {
      const found = sales.find(s => s._id === index + 1);
      return {
        month,
        total: found ? found.total : 0
      };
    });

    res.status(200).json(formattedData);

  } catch (error) {
    console.error("Monthly Sales Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


exports.getTopCustomers = async (req, res) => {
  try {
    const topCustomers = await Invoice.aggregate([
      {
        $group: {
          _id: "$customerId",
          totalPurchase: { $sum: "$totalAmount" }
        }
      },
      { $sort: { totalPurchase: -1 } },
      { $limit: 10 },

      // ✅ Join customer
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer"
        }
      },

      // ✅ SAFE UNWIND (IMPORTANT FIX)
      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true
        }
      },

      // ✅ FILTER INVALID CUSTOMERS
      {
        $match: {
          "customer.isActive": true
        }
      },

      {
        $project: {
          _id: 0,
          name: { $ifNull: ["$customer.name", "Unknown"] },
          totalPurchase: 1
        }
      }
    ]);

    res.status(200).json(topCustomers);

  } catch (error) {
    console.error("Top Customers Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

