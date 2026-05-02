const Expense = require("../models/Expense");

// Add Expense
exports.addExpense = async (req, res) => {
  try {
    const expense = await Expense.create(req.body);
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
      const endDate = new Date(y, m + 1, 0, 23, 59, 59);
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
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//  Delete Expense
exports.deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
