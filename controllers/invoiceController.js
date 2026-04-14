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
      paidAmount = 0,
      previousAmount = 0
    } = req.body;

    if (!customerId || !products || products.length === 0) {
      return res.status(400).json({ message: "Invalid invoice data" });
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
        return res.status(404).json({ message: "Invalid product" });
      }

      console.log("STOCK CHECK:", {
        name: product.name,
        dbStock: product.stockQty,
        requested: grouped[productId]
      });

      if (grouped[productId] > product.stockQty) {
        return res.status(400).json({
          message: `Only ${product.stockQty} units available for ${product.name}`
        });
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
        return res.status(400).json({
          message: "Stock changed. Please refresh and try again."
        });
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

    const total = round2(calculatedTotal);
    const paid = round2(paidAmount);
    const previous = round2(previousAmount);

    const rawDue = total + previous - paid;
    const totalDueAmount = round2(Math.max(rawDue, 0));

    console.log("Invoice created:", {
      total,
      paid,
      totalDueAmount
    });

    // Check customer exists & is active
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (customer.isActive === false) {
      return res.status(400).json({
        message: "Customer is inactive. Cannot create invoice."
      });
    }

    const invoice = await Invoice.create({
      invoiceNumber,
      customerId,
      customerName: customer.name, 
      products,
      totalAmount: total,
      paidAmount: paid,
      previousAmount: previous,
      totalDueAmount,
      createdBy: req.user.id
    });

    const newTotalPurchase = round2(customer.totalPurchase + total);
    const newTotalPaid = round2(customer.totalPaid + paid);
    const newDue = round2(Math.max(newTotalPurchase - newTotalPaid, 0));

    await Customer.findByIdAndUpdate(customerId, {
      totalPurchase: newTotalPurchase,
      totalPaid: newTotalPaid,
      dueAmount: newDue
    });

    const populatedInvoice = await Invoice.findById(invoice._id)
    .populate("customerId", "name contact address")
    .populate("products.productId", "name rate");

    if (global.io) {
      const userId = String(req.user.id);
      global.io.to(userId).emit("invoiceCreated");
      global.io.to(userId).emit("stockUpdated");
      global.io.to(userId).emit("customerUpdated");
      global.io.to(userId).emit("dashboardUpdated");
      global.io.to(userId).emit("dashboardUpdated");
    }

    res.status(201).json({
      message: "Invoice created successfully",
      invoice: populatedInvoice
    });

  } catch (error) {
    console.error("CREATE INVOICE ERROR:", error);
    res.status(500).json({ message: error.message});
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
        // Check customer exists & is active
    const customer = await Customer.findById(oldInvoice.customerId);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (customer.isActive === false) {
      return res.status(400).json({
        message: "Cannot update invoice. Customer is inactive."
      });
    }

    //  Revert old customer data
    await Customer.findByIdAndUpdate(oldInvoice.customerId, {
      $inc: {
        totalPurchase: -oldInvoice.totalAmount,
        totalPaid: -(oldInvoice.paidAmount || 0),
        dueAmount: -oldInvoice.totalDueAmount
      }
    });

    //  Recalculate due

const previous = round2(newData.previousAmount || 0);
const paid = round2(newData.paidAmount || 0);
let calculatedTotal = 0;

for (const item of newData.products) {
  const product = await Product.findById(item.productId);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const price = product.rate;
  const qty = item.qty;
  const discount = Number(item.discount) || 0;

  const gross = price * qty;
  const discountAmount = (gross * discount) / 100;
  const final = gross - discountAmount;

  calculatedTotal += final;
}
const total = round2(calculatedTotal);
const rawDue = total + previous - paid;
const totalDueAmount = round2(Math.max(rawDue, 0));


    //  Update invoice
const updatedInvoice = await Invoice.findByIdAndUpdate(
  invoiceId,
  {
    ...newData,
    totalAmount: total,   
    totalDueAmount
  },
  { new: true }
);

    //  Apply new customer data
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

    //  Restore stock
    for (const item of invoice.products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQty: item.qty }
      });
    }

    //  Restore customer data
    const customer = await Customer.findById(invoice.customerId);

const newTotalPurchase = round2(customer.totalPurchase - invoice.totalAmount);
const newTotalPaid = round2(customer.totalPaid - (invoice.paidAmount || 0));
const newDue = round2(Math.max(newTotalPurchase - newTotalPaid, 0));

await Customer.findByIdAndUpdate(invoice.customerId, {
  totalPurchase: newTotalPurchase,
  totalPaid: newTotalPaid,
  dueAmount: newDue
});


    //  Delete invoice
    await Invoice.findByIdAndDelete(invoiceId);

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("DELETE INVOICE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
