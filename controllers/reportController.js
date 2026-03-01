const Invoice = require("../models/Invoice");
const Expense = require("../models/Expense");
const Customer = require("../models/Customer");


//   try {
//     const { month, year, search } = req.query;

//     // 🗓 Date filter
//     let startDate, endDate;

//     if (month && year) {
//       startDate = new Date(year, month - 1, 1);
//       endDate = new Date(year, month, 0, 23, 59, 59);
//     }

//     const invoiceFilter = {};
//     const expenseFilter = {};

//     if (startDate && endDate) {
//       invoiceFilter.createdAt = { $gte: startDate, $lte: endDate };
//       expenseFilter.createdAt = { $gte: startDate, $lte: endDate };
//     }

//     // 🔎 Search filter
//     if (search) {
//       invoiceFilter.$or = [
//         { invoiceNumber: { $regex: search, $options: "i" } }
//       ];
//     }

//     // 📄 Fetch Data
//     const invoices = await Invoice.find(invoiceFilter)
//   .populate("customerId", "name contact address gstin")
//   .populate("products.productId", "name rate discount")
//   .sort({ createdAt: -1 });


//     const expenses = await Expense.find(expenseFilter);

//     // 📊 Calculate Summary
//     const totalSales = invoices.reduce(
//       (sum, inv) => sum + (inv.totalAmount || 0),
//       0
//     );

//     const totalPurchase = expenses.reduce(
//       (sum, exp) => sum + (exp.amount || 0),
//       0
//     );

//     const pAndL = totalSales - totalPurchase;

//     // 🧾 Format invoice response for your frontend
//     const formattedInvoices = invoices.map(inv => ({
//   _id: inv._id,
//   date: inv.createdAt,
//   invoiceNo: inv.invoiceNumber,

//   customer: {
//     name: inv.customerId?.name || "N/A",
//     contact: inv.customerId?.contact || "",
//     address: inv.customerId?.address || "",
//     gstin: inv.customerId?.gstin || ""
//   },

//   items: inv.products.map(item => ({
//     productName: item.productId?.name || "Product",
//     qty: item.qty,
//     rate: item.rate,
//     discount: item.discount,
//     total: item.qty * item.rate - ((item.qty * item.rate) * (item.discount || 0) / 100)
//   })),

//   grandTotal: inv.totalAmount,
//   paid: inv.paidAmount || 0,
//   balance: inv.totalDueAmount || 0
// }));


//     res.json({
//       summary: {
//         totalSales,
//         totalPurchase,
//         pAndL,
//         totalAmount: totalSales
//       },
//       invoices: formattedInvoices
//     });

//   } catch (error) {
//     console.error("REPORT ERROR:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

exports.getReports = async (req, res) => {
  try {
    const { year, month, day, search } = req.query;

    let invoiceFilter = {};
    let expenseFilter = {};

    /* ================= DATE FILTER ================= */

    if (year) {
      const y = Number(year);
      const m = month ? Number(month) - 1 : null;
      const d = day ? Number(day) : null;

      let startDate;
      let endDate;

 if (year && month && day) {
  // Specific day
  startDate = new Date(y, m, d);
  endDate = new Date(y, m, d, 23, 59, 59);
} 
else if (year && month) {
  // Full month
  startDate = new Date(y, m, 1);
  endDate = new Date(y, m + 1, 0, 23, 59, 59);
} 
else {
  // Full year
  startDate = new Date(y, 0, 1);
  endDate = new Date(y, 11, 31, 23, 59, 59);
}

      invoiceFilter.date = { $gte: startDate, $lte: endDate };

      expenseFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    /* ================= SEARCH FILTER ================= */

    if (search) {
      invoiceFilter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { "customerId.name": { $regex: search, $options: "i" } }
      ];
    }

    /* ================= FETCH DATA ================= */

    const invoices = await Invoice.find(invoiceFilter)
      .populate("customerId", "name contact address gstin  isActive")
      .populate("products.productId", "name rate discount")
      .sort({ createdAt: -1 });

    const expenses = await Expense.find(expenseFilter);

    /* ================= SUMMARY CALCULATION ================= */

    const totalSales = invoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    const totalPurchase = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );

    const pAndL = totalSales - totalPurchase;

    /* ================= FORMAT RESPONSE ================= */

    const formattedInvoices = invoices.map(inv => ({
      _id: inv._id,
      date: inv.createdAt,
      invoiceNo: inv.invoiceNumber,

     customer: inv.customerId
  ? {
      name: inv.customerId.name,
      contact: inv.customerId.contact || "",
      address: inv.customerId.address || "",
      gstin: inv.customerId.gstin || "",
      isActive: inv.customerId.isActive
    }
  : {
      name: "N/A",
      contact: "",
      address: "",
      gstin: "",
      isActive: false
    },
      items: inv.products.map(item => ({
        productName: item.productId?.name || "Product",
        qty: item.qty,
        rate: item.rate,
        discount: item.discount,
        total:
          item.qty * item.rate -
          (item.qty * item.rate * (item.discount || 0)) / 100
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
    const { year, month } = req.query;

    const y = parseInt(year) || new Date().getFullYear();
    const m = month ? parseInt(month) - 1 : null;

    let startDate;
    let endDate;

    if (month) {
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0, 23, 59, 59);
    } else {
      startDate = new Date(y, 0, 1);
      endDate = new Date(y, 11, 31, 23, 59, 59);
    }

    const invoices = await Invoice.find({
      date: { $gte: startDate, $lte: endDate }
    });

    // ================= IF MONTH SELECTED → RETURN DAILY DATA =================
    if (month) {
      const daysInMonth = new Date(y, m + 1, 0).getDate();

      const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        sales: 0,
        payments: 0,
        due: 0
      }));

      invoices.forEach(inv => {
        const invoiceDate = new Date(inv.date);
        const dayIndex = invoiceDate.getDate() - 1;

        dailyData[dayIndex].sales += inv.totalAmount || 0;
        dailyData[dayIndex].payments += inv.paidAmount || 0;
        dailyData[dayIndex].due += inv.totalDueAmount || 0;
      });

      return res.json(dailyData);
    }

    // ================= IF ONLY YEAR → RETURN MONTHLY DATA =================

    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    const monthlyData = months.map(month => ({
      month,
      sales: 0,
      payments: 0,
      due: 0
    }));

    invoices.forEach(inv => {
      const invoiceDate = new Date(inv.date);
      const monthIndex = invoiceDate.getMonth();

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
