const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Payment = require("../models/Payment");


exports.getDashboardData = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

// Invoice paid
const invoicePaidAgg = await Invoice.aggregate([
  {
    $match: {
      createdAt: { $gte: startOfMonth },
      // createdBy: req.user.id   
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: "$paidAmount" }
    }
  }
]);

// Payments
const paymentAgg = await Payment.aggregate([
  {
    $match: {
      type: "payment",
      date: { $gte: startOfMonth },
      user: req.user.id   
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: "$amount" }
    }
  }
]);

// Returns
const returnAgg = await Payment.aggregate([
  {
    $match: {
      type: "return",
      date: { $gte: startOfMonth },
      user: req.user.id   
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: "$amount" }
    }
  }
]);

// Customer manual adjustments
const adjustmentAgg = await Customer.aggregate([
  {
    $match: {
      isActive: true,
      user: req.user.id   
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: "$manualAdjustment" }
    }
  }
]);

const customers = await Customer.find({
  isActive: true,
  user: req.user.id
});

let totalSales = 0;
let totalPaid = 0;
let totalDue = 0;

customers.forEach(c => {
  totalSales += c.totalPurchase || 0;
  totalPaid += c.totalPaid || 0;
  totalDue += c.dueAmount || 0;
});

const outstanding = totalDue;
    // 2️⃣ Outstanding This Month
// 2️⃣ Outstanding (CORRECT)
const outstandingAgg = await Customer.aggregate([
  {
    $match: {
      isActive: true,
      // user: req.user.id
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: "$dueAmount" }   
    }
  }
]);


    // 3️⃣ Total Customers
    const totalCustomers = await Customer.countDocuments({
  isActive: true,
  user: req.user.id
});

    // 4️⃣ Open Invoices (Pending)
   const openInvoices = await Invoice.countDocuments({
     totalDueAmount: { $gt: 0 },
     createdBy: req.user.id   // ✅ IMPORTANT
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

