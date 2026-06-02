const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const asyncHandler =require("../utils/asyncHandler");
const recalcCustomer =require("../utils/recalcCustomer");
const AppError =require("../utils/AppError");
const {createLedgerEntry} = require("../utils/accounting/ledgerService");

const round2 = (value) => Number(Number(value).toFixed(2));
// const {calculateCustomerBalance} = require("../utils/customerBalance");

/* Generate unique invoice number in format: #AEMM-XXXX */

const generateInvoiceNumber = async () => {
  const orgCode = "#AE";

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // 01-12

  // Find last invoice of current month
  const lastInvoice = await Invoice.findOne({
    invoiceNumber: { $regex: `^${orgCode}${month}-` }
  })
    .sort({ createdAt: -1 })
    .select("invoiceNumber");

  let nextSeq = 1;

  if (lastInvoice) {
    const lastNumber = lastInvoice.invoiceNumber.split("-")[1]; // 0001
    nextSeq = parseInt(lastNumber, 10) + 1;
  }

  const seqStr = String(nextSeq).padStart(4, "0");

  return `${orgCode}${month}-${seqStr}`;
};


/* =========================
   CREATE INVOICE
========================= */
exports.createInvoice =asyncHandler(async (req, res) => {
    const {
      customerId,
      products,
      paidAmount = 0,
    } = req.body;

  if (Number(paidAmount) < 0) {

    throw new AppError(
      "Paid amount cannot be negative",
      400
    );

  }

  if (
    !customerId ||
    !products ||
    products.length === 0
  ) {

    throw new AppError(
      "Invalid invoice data",
      400
    );

  }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    let calculatedTotal = 0;

    const productIds = products.map(p => p.productId);

    const productDocs = await Product.find({
      _id: { $in: productIds }
    });

    const productMap = {};
    productDocs.forEach(p => {
      productMap[p._id.toString()] = p;
    });

    // ✅ STEP 1: GROUP PRODUCTS
    const grouped = {};
    products.forEach(item => {
      const id = item.productId.toString();
      if (!grouped[id]) grouped[id] = 0;
      grouped[id] += Number(item.qty);
    });

    // ✅ STEP 2: VALIDATE STOCK
    for (const productId in grouped) {
      const product = productMap[productId];

      if (!product) {
        throw new AppError(
          "Invalid product",
          404
        );
      }

      console.log("STOCK CHECK:", {
        name: product.name,
        dbStock: product.stockQty,
        requested: grouped[productId]
      });

      if (grouped[productId] > product.stockQty) {

        throw new AppError(
          `Only ${product.stockQty} units available for ${product.name}`,
          400
        );

      }
    }

    // ✅ STEP 3: ATOMIC STOCK UPDATE
    for (const productId in grouped) {
      const qty = grouped[productId];

      const updated = await Product.findOneAndUpdate(
        { _id: productId, stockQty: { $gte: qty } },
        { $inc: { stockQty: -qty } },
        { new: true }
      );

      if (!updated) {

        throw new AppError(
          "Stock changed. Please refresh and try again.",
          400
        );

      }
    }

    // ✅ STEP 4: CALCULATE TOTAL
    for (const item of products) {
      const product = productMap[item.productId.toString()];

      const price = Number(product.rate) || 0;
      const qty = item.qty;
      const discount = Number(item.discount) || 0;

      const gross = price * qty;
      const discountAmount = (gross * discount) / 100;
      const final = gross - discountAmount;

      calculatedTotal += final;
    }
    // Check customer exists & is active

    const customer =
      await Customer.findById(customerId);

  if (!customer) {

    throw new AppError(
      "Customer not found",
      404
    );

  }

  if (customer.isActive === false) {

    throw new AppError(
      "Customer is inactive. Cannot create invoice.",
      400
    );

  }

    const total =
      round2(calculatedTotal);

    const paid =
      round2(paidAmount);

    const previous =
      round2(customer.dueAmount || 0);

    const availableAdvance =
      round2(customer.advanceAmount || 0);

    const advanceUsed =
      round2(
        Math.min(
          availableAdvance,
          total
        )
      );

    const adjustedTotal =
      round2(total - advanceUsed);

    const runningBalance =
      round2(
        previous +
        adjustedTotal -
        paid
      );

    const totalDueAmount =
      round2(
        Math.max(runningBalance, 0)
      );

  const invoice = await Invoice.create({
    invoiceNumber,
    customerId,
    customerName: customer.name,
    products,
    totalAmount: total,

    paidAmount: paid,
    initialPaidAmount: paid,

    previousAmount: previous,
    advanceUsed,
    totalDueAmount,
    createdBy: req.user.id
  });

    const newTotalPurchase =
      round2(
        customer.totalPurchase + total
      );

    const newTotalPaid =
      round2(
        customer.totalPaid + paid
      );

    /*
Customer balance after invoice
*/
  await Customer.findByIdAndUpdate(
    customerId,
    {
      totalPurchase: newTotalPurchase,
      totalPaid: newTotalPaid
    }
  );

  await recalcCustomer(customerId);

  await createLedgerEntry({
    customerId:
      customer._id,

    date:
      invoice.date,

    type:
      "invoice",

    referenceId:
      invoice._id,

    referenceNumber:
      invoice.invoiceNumber,

    addedAmount:
      invoice.totalAmount,

    notes:
      "Purchase added"
  });

  if (paid > 0) {

    await createLedgerEntry({
      customerId:
        customer._id,

      date:
        invoice.date,

      type:
        "invoice_payment",

      referenceId:
        invoice._id,

      referenceNumber:
        invoice.invoiceNumber,

      deductedAmount:
        paid,

      notes:
        "Payment received during invoice creation"
    });

  }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("customerId", "name contact address")
      .populate("products.productId", "name rate");

    if (global.io) {
      const userId = String(req.user.id);
      global.io.to(userId).emit("invoiceCreated");
      global.io.to(userId).emit("stockUpdated");
      global.io.to(userId).emit("customerUpdated");
      global.io.to(userId).emit("dashboardUpdated");
    }

    res.status(201).json({
      message: "Invoice created successfully",
      invoice: populatedInvoice
    });

});

/* =========================
   GET ALL INVOICES
========================= */
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("customerId", "name contact")
      .populate("products.productId", "name rate")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    console.error("GET INVOICES ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   GET SINGLE INVOICE
========================= */
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customerId")
      .populate("products.productId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    console.error("GET INVOICE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   UPDATE INVOICE (ADMIN)
========================= */
exports.updateInvoice = async (req, res) => {

  try {

    const invoiceId = req.params.id;

    const {
      products,
      paidAmount = 0,
      previousAmount = 0,
      advanceUsed = 0
    } = req.body;

    // OLD INVOICE
    const oldInvoice =
      await Invoice.findById(invoiceId);

    if (!oldInvoice) {
      return res.status(404).json({
        message: "Invoice not found"
      });
    }

    // CUSTOMER
    const customer =
      await Customer.findById(
        oldInvoice.customerId
      );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    // REMOVE OLD EFFECT
    const revertedPurchase =
      round2(
        customer.totalPurchase -
        oldInvoice.totalAmount
      );

    const revertedPaid =
      round2(
        customer.totalPaid -
        oldInvoice.paidAmount
      );

    // RECALCULATE TOTAL
    const total =
      round2(
        products.reduce(
          (sum, item) =>
            sum +
            (
              item.qty *
              item.rate
            ),
          0
        )
      );

    // NEW DUE
    // NEW DUE
    const adjustedTotal =
      round2(
        total - advanceUsed
      );

    const runningBalance =
      round2(
        previousAmount +
        adjustedTotal -
        paidAmount
      );

    const totalDueAmount =
      round2(
        Math.max(
          runningBalance,
          0
        )
      );

    // UPDATE INVOICE
    const updatedInvoice =
      await Invoice.findByIdAndUpdate(
        invoiceId,
        {
          products,
          totalAmount: total,
          paidAmount,
          previousAmount,
          advanceUsed,
          totalDueAmount
        },
        { new: true }
      );

    // APPLY NEW EFFECT
    const finalPurchase =
      round2(
        revertedPurchase + total
      );

    const finalPaid =
      round2(
        revertedPaid + paidAmount
      );

    // CALCULATE BALANCE
    // CALCULATE BALANCE
    await Customer.findByIdAndUpdate(
      customer._id,
      {
        totalPurchase: finalPurchase,
        totalPaid: finalPaid
      }
    );

    await recalcCustomer(customer._id);

    res.json({
      message:
        "Invoice updated successfully",

      invoice: updatedInvoice
    });

  } catch (error) {

    console.error(
      "UPDATE INVOICE ERROR:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });

  }
};

/* =========================
   DELETE INVOICE (ADMIN)
========================= */
exports.deleteInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    //  Restore stock
    for (const item of invoice.products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQty: item.qty }
      });
    }

    //  Restore customer data
    const customer = await Customer.findById(invoice.customerId);

    const newTotalPurchase =
      round2(
        customer.totalPurchase -
        invoice.totalAmount
      );

    const newTotalPaid =
      round2(
        customer.totalPaid -
        (invoice.paidAmount || 0)
      );

    await Customer.findByIdAndUpdate(
      invoice.customerId,
      {
        totalPurchase: newTotalPurchase,
        totalPaid: newTotalPaid
      }
    );

    await recalcCustomer(
      invoice.customerId
    );


    //  Delete invoice
    await Invoice.findByIdAndDelete(invoiceId);

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("DELETE INVOICE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};