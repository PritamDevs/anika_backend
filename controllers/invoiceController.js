const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const round2 = (value) => Number(Number(value).toFixed(2));


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
exports.createInvoice = async (req, res) => {
  try {
    const {
      customerId,
      products,
      totalAmount,
      paidAmount = 0,
      previousAmount = 0
    } = req.body;

    if (!customerId || !products || products.length === 0) {
      return res.status(400).json({ message: "Invalid invoice data" });
    }

    // 1️⃣ Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // 2️⃣ Reduce product stock
    for (const item of products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQty: -item.qty }
      });
    }

    // 3️⃣ Calculate due
    const total = round2(totalAmount);
const paid = round2(paidAmount);
const previous = round2(previousAmount);

const rawDue = total + previous - paid;
const totalDueAmount = round2(Math.max(rawDue, 0));


    // 4️⃣ Create invoice
    const invoice = await Invoice.create({
  invoiceNumber,
  customerId,
  products,
  totalAmount: total,
  paidAmount: paid,
  previousAmount: previous,
  totalDueAmount,
  createdBy: req.user.id
});


    // 5️⃣ Update customer
    const customer = await Customer.findById(customerId);

const newTotalPurchase = round2(customer.totalPurchase + total);
const newTotalPaid = round2(customer.totalPaid + paid);
const newDue = round2(Math.max(newTotalPurchase - newTotalPaid, 0));

await Customer.findByIdAndUpdate(customerId, {
  totalPurchase: newTotalPurchase,
  totalPaid: newTotalPaid,
  dueAmount: newDue
});


    res.status(201).json({
      message: "Invoice created successfully",
      invoice
    });
  } catch (error) {
    console.error("CREATE INVOICE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


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
    const newData = req.body;

    const oldInvoice = await Invoice.findById(invoiceId);
    if (!oldInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // 1️⃣ Revert old customer data
    await Customer.findByIdAndUpdate(oldInvoice.customerId, {
      $inc: {
        totalPurchase: -oldInvoice.totalAmount,
        totalPaid: -(oldInvoice.paidAmount || 0),
        dueAmount: -oldInvoice.totalDueAmount
      }
    });

    // 2️⃣ Recalculate due
    const total = round2(newData.totalAmount);
const previous = round2(newData.previousAmount || 0);
const paid = round2(newData.paidAmount || 0);

const rawDue = total + previous - paid;
const totalDueAmount = round2(Math.max(rawDue, 0));


    // 3️⃣ Update invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        ...newData,
        totalDueAmount
      },
      { new: true }
    );

    // 4️⃣ Apply new customer data
    await Customer.findByIdAndUpdate(updatedInvoice.customerId, {
      $inc: {
        totalPurchase: updatedInvoice.totalAmount,
        totalPaid: updatedInvoice.paidAmount || 0,
        dueAmount: updatedInvoice.totalDueAmount
      }
    });

    res.json({
      message: "Invoice updated successfully",
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error("UPDATE INVOICE ERROR:", error);
    res.status(500).json({ message: "Server error" });
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

    // 1️⃣ Restore stock
    for (const item of invoice.products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQty: item.qty }
      });
    }

    // 2️⃣ Restore customer data
    const customer = await Customer.findById(invoice.customerId);

const newTotalPurchase = round2(customer.totalPurchase - invoice.totalAmount);
const newTotalPaid = round2(customer.totalPaid - (invoice.paidAmount || 0));
const newDue = round2(Math.max(newTotalPurchase - newTotalPaid, 0));

await Customer.findByIdAndUpdate(invoice.customerId, {
  totalPurchase: newTotalPurchase,
  totalPaid: newTotalPaid,
  dueAmount: newDue
});


    // 3️⃣ Delete invoice
    await Invoice.findByIdAndDelete(invoiceId);

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("DELETE INVOICE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
