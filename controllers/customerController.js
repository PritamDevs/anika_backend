const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");
const recalcCustomer =require("../utils/recalcCustomer");
const AppError = require("../utils/AppError");
const LedgerEntry =require("../utils/accounting/LedgerEntry");

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
        .populate(
          "products.productId",
          "name"
        )
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

  const ledger =
    await LedgerEntry.find({
      customerId: customer._id
    })
      .sort({
        createdAt: 1
      })
      .lean();

  const formattedLedger =
    ledger.map(entry => ({
      date: entry.date,

      type: {
        opening_balance: "Opening Balance",
        invoice: "Invoice",
        invoice_payment: "Invoice Payment",
        payment: "Payment",
        return_advance: "Return (Advance)",
        return_cash: "Return (Cash)"
      }[entry.type] || entry.type,

      reference:
        entry.referenceNumber || "-",

      debit:
        entry.addedAmount || 0,

      credit:
        entry.deductedAmount || 0,

      due:
        entry.runningDue || 0,

      advance:
        entry.runningAdvance || 0,

      notes:
        entry.notes || ""
    }));

  res.json({
    customer,
    invoices,
    payments,
    returns,
    ledger: formattedLedger
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

    const {
      createLedgerEntry
    } = require(
      "../utils/accounting/ledgerService"
    );

    await createLedgerEntry({
      customerId: customer._id,

      date: new Date(),

      type: "opening_balance",

      referenceId: customer._id,

      referenceNumber:
        "Opening Balance",

      addedAmount:
        openingBalance > 0
          ? openingBalance
          : 0,

      deductedAmount:
        openingBalance < 0
          ? Math.abs(
            openingBalance
          )
          : 0,

      notes:
        "Opening balance set"
    });

    res.json({
      message:
        "Opening balance updated",
      customer
    });

  });