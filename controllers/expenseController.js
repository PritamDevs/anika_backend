const Expense = require("../models/Expense");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// Add Expense
exports.addExpense = asyncHandler(async (req, res) => {
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
  });

// Get Expenses
exports.getExpenses = asyncHandler(async (req, res) => {
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
  });

// Update Expense
exports.updateExpense = asyncHandler(async (req, res) => {

  const expense =
    await Expense.findOneAndUpdate(
      {
        _id: req.params.id
      },
      req.body,
      {
        new: true
      }
    );

  if (!expense) {
    throw new AppError(
      "Expense not found",
      404
    );
  }

  if (global.io) {
    global.io.emit("dashboardUpdated");
  }

  res.json(expense);

});

//  Delete Expense
exports.deleteExpense = asyncHandler(async (req, res) => {

  const expense =
    await Expense.findOneAndDelete({
      _id: req.params.id
    });
  if (!expense) {
    throw new AppError(
      "Expense not found",
      404
    );
  }
    if (global.io) {
      global.io.emit("dashboardUpdated");
    }
    res.json({ message: "Expense deleted" });
  });
