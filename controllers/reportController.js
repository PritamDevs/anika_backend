const Invoice = require("../models/Invoice");
const Expense = require("../models/Expense");
const Customer = require("../models/Customer");

exports.getReports = async (req, res) => {
  try {
    const { month, year, search } = req.query;

    // 🗓 Date filter
    let startDate, endDate;

    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    }

    const invoiceFilter = {};
    const expenseFilter = {};

    if (startDate && endDate) {
      invoiceFilter.createdAt = { $gte: startDate, $lte: endDate };
      expenseFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    // 🔎 Search filter
    if (search) {
      invoiceFilter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } }
      ];
    }

    // 📄 Fetch Data
    const invoices = await Invoice.find(invoiceFilter)
  .populate("customerId", "name contact address gstin")
  .populate("products.productId", "name rate discount")
  .sort({ createdAt: -1 });


    const expenses = await Expense.find(expenseFilter);

    // 📊 Calculate Summary
    const totalSales = invoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    const totalPurchase = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );

    const pAndL = totalSales - totalPurchase;

    // 🧾 Format invoice response for your frontend
    const formattedInvoices = invoices.map(inv => ({
  _id: inv._id,
  date: inv.createdAt,
  invoiceNo: inv.invoiceNumber,

  customer: {
    name: inv.customerId?.name || "N/A",
    contact: inv.customerId?.contact || "",
    address: inv.customerId?.address || "",
    gstin: inv.customerId?.gstin || ""
  },

  items: inv.products.map(item => ({
    productName: item.productId?.name || "Product",
    qty: item.qty,
    rate: item.rate,
    discount: item.discount,
    total: item.qty * item.rate - ((item.qty * item.rate) * (item.discount || 0) / 100)
  })),

  grandTotal: inv.totalAmount,
  paid: inv.paidAmount || 0,
  balance: inv.totalDueAmount || 0
}));


    res.json({
      summary: {
        totalSales,
        totalPurchase,
        pAndL,
        totalAmount: totalSales
      },
      invoices: formattedInvoices
    });

  } catch (error) {
    console.error("REPORT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getMonthlyChart = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const invoices = await Invoice.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    const monthlyData = months.map((month) => ({
      month,
      sales: 0,
      payments: 0,
      due: 0
    }));

    invoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const monthIndex = date.getMonth();

      monthlyData[monthIndex].sales += inv.totalAmount || 0;
      monthlyData[monthIndex].payments += inv.paidAmount || 0;
      monthlyData[monthIndex].due += inv.totalDueAmount || 0;
    });

    res.json(monthlyData);

  } catch (err) {
    console.error("Monthly Chart Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
