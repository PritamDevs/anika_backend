const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");

exports.getDashboardData = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1️⃣ Total Sales This Month
    const totalSalesAgg = await Invoice.aggregate([
      { $match: { date: { $gte: startOfMonth } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" }
        }
      }
    ]);

    const totalSales = totalSalesAgg[0]?.total || 0;

    // 2️⃣ Outstanding This Month
    const outstandingAgg = await Invoice.aggregate([
      { $match: { date: { $gte: startOfMonth } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalDueAmount" }
        }
      }
    ]);

    const outstanding = outstandingAgg[0]?.total || 0;

    // 3️⃣ Total Customers
    const totalCustomers = await Customer.countDocuments();

    // 4️⃣ Open Invoices (Pending)
    const openInvoices = await Invoice.countDocuments({
      totalDueAmount: { $gt: 0 }
    });

    // 5️⃣ Low Stock Products
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$stockQty", "$lowStockAlert"] }
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
          date: {
            $gte: new Date(`${year}-01-01`),
    $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$date" },
          total: { $sum: "$totalAmount" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

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
      {
        $sort: { totalPurchase: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer"
        }
      },
      { $unwind: "$customer" },
      {
        $project: {
          _id: 0,
          name: "$customer.name",
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


