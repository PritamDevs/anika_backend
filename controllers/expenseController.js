const Expense = require("../models/Expense");

// Add Expense
exports.addExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,

      date: req.body.date
        ? new Date(req.body.date)
        : new Date()
    });
    if (global.io) {
      global.io.emit("dashboardUpdated");
    }
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get Expenses
exports.getExpenses = async (req, res) => {
  try {
    const { year, month } = req.query;
    let filter = {};

    if (year && month) {
      const y = Number(year);
      const m = Number(month) - 1;
      const startDate = new Date(y, m, 1);
      const endDate = new Date(
        y,
        m + 1,
        0,
        23,
        59,
        59,
        999
      );
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Expense
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id
      },
      req.body,
      { new: true }
    );
    if (global.io) {
      global.io.emit("dashboardUpdated");
    }
    res.json(expense);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message
    });
  }
};

//  Delete Expense
exports.deleteExpense = async (req, res) => {
  try {
    await Expense.findOneAndDelete({
      _id: req.params.id,
    });
    if (global.io) {
      global.io.emit("dashboardUpdated");
    }
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
