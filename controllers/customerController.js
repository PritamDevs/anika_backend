const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");
const recalcCustomer =require("../utils/recalcCustomer");
const AppError = require("../utils/AppError");

// CREATE CUSTOMER
exports.createCustomer =
  asyncHandler(async (req, res) => {
    // console.log(
    //   "CREATE CUSTOMER BODY:",
    //   req.body
    // );
    const { name, contact, address } = req.body;

    if (!name) {
      throw new AppError(
        "Name is required",
        400
      );
    }

    let customer;


    // ✅ CASE 1: If contact exists → avoid duplicate
    if (contact && contact.trim() !== "") {
      customer = await Customer.findOneAndUpdate(
        {
          contact: contact,
          user: req.user.id
        },
        {
          $setOnInsert: {
            name,
            contact,
            address,
            openingBalance: 0,
            totalPurchase: 0,
            totalPaid: 0,
            dueAmount: 0,
            advanceAmount: 0,
            user: req.user.id
          }
        },
        {
          new: true,
          upsert: true
        }
      );
    }
    // ✅ CASE 2: No contact → ALWAYS create new customer
    else {
      customer = await Customer.create({
        name,
        contact: "N/A",
        address,
        openingBalance: 0,   
        totalPurchase: 0,
        totalPaid: 0,
        dueAmount: 0,
        advanceAmount: 0,
        user: req.user.id
      });
    }

    if (global.io) {
      global.io.to(String(req.user.id)).emit("customerUpdated");
    }

    res.status(201).json({
      message: "Customer created successfully",
      customer
    });

  });

// GET ALL CUSTOMERS
exports.getAllCustomers =asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = {
      isActive: true,
      user: req.user.id,
      ...(search && { name: { $regex: search, $options: "i" } })
    };

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ name: 1 })
      .collation({ locale: "en", strength: 2 })
      .skip(skip)
      .limit(limit);

    res.json({
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  });

exports.updateCustomer = asyncHandler(async (req, res) => {
    const { name, contact, address } = req.body;

    const updates = {};

    if (name !== undefined)
      updates.name = name;

    if (contact !== undefined)
      updates.contact = contact;

    if (address !== undefined)
      updates.address = address;

    const customer =
      await Customer.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true }
      );

    if (!customer) {
      throw new AppError(
        "Customer not found",
        404
      );
    }

    res.json({
      message: "Customer updated successfully",
      customer
    });

  });


// DELETE CUSTOMER
exports.deleteCustomer = asyncHandler(async (req, res) => {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!customer) {
      throw new AppError(
        "Customer not found",
        404
      );
    }

    res.json({ message: "Customer marked as inactive" });
  });

exports.getAllCustomersList = asyncHandler(async (req, res) => {

    const customers = await Customer.find(
      { user: req.user.id, isActive: true },
      "name contact address dueAmount advanceAmount totalPurchase totalPaid openingBalance"
    ).sort({ name: 1 }).collation({ locale: "en", strength: 2 });

    res.json({ customers });
  });



exports.getCustomerDetails = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    user: req.user.id,
    isActive: true
  }).lean();

  if (!customer) {
    throw new AppError(
      "Customer not found",
      404
    );
  }

  const [invoices, payments, returns] =
    await Promise.all([

      Invoice.find({
        customerId: customer._id
      })
        .sort({ createdAt: 1 })
        .lean(),

      Payment.find({
        customerId: customer._id,
        type: "payment"
      })
        .populate(
          "invoiceId",
          "invoiceNumber"
        )
        .sort({ createdAt: 1 })
        .lean(),

      Payment.find({
        customerId: customer._id,
        type: "return"
      })
        .populate(
          "invoiceId",
          "invoiceNumber"
        )
        .sort({ createdAt: 1 })
        .lean()

    ]);

  const ledgerEntries = [];

  if ((customer.openingBalance || 0) !== 0) {

    ledgerEntries.push({
      date: customer.createdAt,

      type: "Opening Balance",

      reference: "Migrated Balance",

      debit:
        customer.openingBalance > 0
          ? Number(customer.openingBalance)
          : 0,

      credit:
        customer.openingBalance < 0
          ? Math.abs(
            Number(customer.openingBalance)
          )
          : 0
    });

  }

  invoices.forEach(invoice => {

    ledgerEntries.push({
      date: invoice.date,
      type: "Invoice",
      reference: invoice.invoiceNumber,

      debit: Number(invoice.totalAmount || 0),
      credit: 0
    });


    // Payment received during invoice creation

    if (Number(invoice.paidAmount || 0) > 0) {

      ledgerEntries.push({
        date: invoice.date,

        type: "Invoice Payment",

        reference: invoice.invoiceNumber,

        debit: 0,

        credit: Number(invoice.paidAmount || 0)
      });
    }

    // Advance used

    if (Number(invoice.advanceUsed || 0) > 0) {

      ledgerEntries.push({
        date: invoice.date,

        type: "Advance Used",

        reference: invoice.invoiceNumber,

        debit: 0,
        credit: 0,

        amount: Number(invoice.advanceUsed)
      });
    }

  });

  payments.forEach(payment => {

    ledgerEntries.push({
      date: payment.date,

      type:
        payment.paymentMode === "advance"
          ? "Advance Received"
          : "Payment",

      reference:
        payment.invoiceId?.invoiceNumber ||
        payment.reference ||
        "-",

      debit: 0,

      credit:
        Number(payment.amount || 0)
    });

  });

  returns.forEach(ret => {

    ledgerEntries.push({
      date: ret.date,

      type:
        ret.paymentMode === "advance"
          ? "Return (Advance)"
          : "Return (Cash)",

      reference:
        ret.invoiceId?.invoiceNumber ||
        ret.reference ||
        "-",

      debit:
        ret.paymentMode === "cash" ||
          ret.paymentMode === "upi"
          ? Number(ret.amount || 0)
          : 0,

      credit:
        ret.paymentMode === "advance"
          ? Number(ret.amount || 0)
          : 0
    });

  });

  ledgerEntries.sort((a, b) => {

    const dateDiff =
      new Date(a.date) - new Date(b.date);

    if (dateDiff !== 0)
      return dateDiff;

    const order = {
      "Opening Balance": 0,
      Invoice: 1,
      "Invoice Payment": 2,
      "Advance Used": 3,
      Payment: 4,
      "Return (Cash)": 5,
      "Return (Advance)": 5,
      "Advance Received": 6
    };

    return (
      (order[a.type] || 99) -
      (order[b.type] || 99)
    );

  });


  let runningPurchase = 0;
  let runningPaid = 0;

  const openingBalance =
    Number(customer.openingBalance || 0);

  const ledger = ledgerEntries.map(entry => {

    switch (entry.type) {

      case "Opening Balance":

        if (openingBalance < 0) {
          runningPaid +=
            Math.abs(openingBalance);
        }

        break;

      case "Invoice":
        runningPurchase +=
          Number(entry.debit || 0);
        break;

      case "Invoice Payment":
      case "Payment":
      case "Advance Received":
        runningPaid +=
          Number(entry.credit || 0);
        break;

      case "Return (Advance)":
        runningPurchase -=
          Number(entry.credit || 0);
        break;

      case "Return (Cash)":
        runningPurchase -=
          Number(entry.debit || 0);

        runningPaid -=
          Number(entry.debit || 0);
        break;

      default:
        break;
    }

    const balance =
      Number(
        (
          runningPaid
          -
          runningPurchase
          -
          openingBalance
        ).toFixed(2)
      );

    return {
      ...entry,

      due:
        balance < 0
          ? Math.abs(balance)
          : 0,

      advance:
        balance > 0
          ? balance
          : 0
    };
  });

  ledger.reverse();

  res.json({
    customer,
    invoices,
    payments,
    returns,
    ledger
  });


});
exports.updateOpeningBalance =
  asyncHandler(async (req, res) => {

    const { openingBalance } =
      req.body;

    const customer =
      await Customer.findById(
        req.params.id
      );

    if (!customer) {
      throw new AppError(
        "Customer not found",
        404
      );
    }

    customer.openingBalance =
      Number(openingBalance || 0);

    await customer.save();

    await recalcCustomer(
      customer._id
    );

    res.json({
      message:
        "Opening balance updated",
      customer
    });

  });