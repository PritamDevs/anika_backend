const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const recalcCustomer = require("../utils/recalcCustomer");
const {calculateReturnAmount} = require( "../utils/accounting/returnCalculator");
const {createLedgerEntry} = require("../utils/accounting/ledgerService");
const round2 = (value) =>
  Number(Number(value).toFixed(2));

// ➕ Add Payment / Return
exports.addPayment = async (req, res) => {
  try {
    let returnAmount = 0;
    const {
      customerId,
      invoiceId,
      gstin,
      amount,
      type,
      paymentMode,
      reference,
      date,
      returnedProducts = []
    } = req.body;

    if (
      !customerId ||
      !type ||
      !paymentMode
    ) {
      return res.status(400).json({
        message: "Required fields missing"
      });
    }

    if (
      type === "payment" &&
      !amount
    ) {
      return res.status(400).json({
        message: "Payment amount required"
      });
    }
    const customer =
      await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    const transactionAmount =
      type === "payment"
        ? Number(amount)
        : 0;

    if (
      type === "payment" &&
      transactionAmount <= 0
    ) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }

    // =====================================
    // PAYMENT
    // =====================================

    if (type === "payment") {

      customer.totalPaid =
        round2(
          (customer.totalPaid || 0) +
          transactionAmount
        );

      await customer.save();

      if (invoiceId) {

        const invoice =
          await Invoice.findById(invoiceId);

        if (invoice) {

          invoice.paidAmount =
            round2(
              (invoice.paidAmount || 0) +
              transactionAmount
            );

          invoice.totalDueAmount =
            round2(
              Math.max(
                0,
                invoice.totalAmount -
                invoice.paidAmount
              )
            );

          await invoice.save();
        }
      }

      await recalcCustomer(customerId);
    }

    // =====================================
    // RETURN
    // =====================================

    if (type === "return") {

      if (paymentMode !== "advance") {

        return res.status(400).json({
          message:
            "Returns must be adjusted through advance only"
        });

      }

      if (!invoiceId) {
        return res.status(400).json({
          message:
            "Invoice selection is required for returns"
        });
      }

      if (
        !returnedProducts ||
        returnedProducts.length === 0
      ) {
        return res.status(400).json({
          message:
            "Select at least one product to return"
        });
      }

      const invoice =
        await Invoice.findById(invoiceId);

        const previousReturns =
          await Payment.find({
            invoiceId,
            type: "return"
          });


        if (!invoice) {
          return res.status(404).json({
            message: "Invoice not found"
          });
        }

        const result =
          calculateReturnAmount(
            invoice,
            returnedProducts
          );

        returnAmount =
          result.returnAmount;

        returnedProducts.splice(
          0,
          returnedProducts.length,
          ...result.enrichedProducts
        );

        for (const returnedItem of returnedProducts) {

          const soldItem =
            invoice.products.find(
              p =>
                String(p.productId) ===
                String(returnedItem.productId)
            );

          if (!soldItem) {
            return res.status(400).json({
              message:
                `${returnedItem.productName} was not sold in this invoice`
            });
          }

          if (
            Number(returnedItem.qty) <= 0
          ) {
            return res.status(400).json({
              message:
                "Return quantity must be greater than zero"
            });
          }

          let alreadyReturnedQty = 0;

          previousReturns.forEach(ret => {

            const matchedItem =
              ret.returnedProducts?.find(
                p =>
                  String(p.productId) ===
                  String(returnedItem.productId)
              );

            if (matchedItem) {
              alreadyReturnedQty +=
                Number(matchedItem.qty || 0);
            }
          });

          const totalReturnedQty =
            alreadyReturnedQty +
            Number(returnedItem.qty);

          if (
            totalReturnedQty >
            Number(soldItem.qty)
          ) {
            return res.status(400).json({
              message:
                `${returnedItem.productName} return quantity exceeds available quantity`
            });
          }
        }
    

      // Increase Stock

      for (const item of returnedProducts) {

        if (!item.productId) continue;

        await Product.findByIdAndUpdate(
          item.productId,
          {
            $inc: {
              stockQty: Number(item.qty)
            }
          }
        );
      }

      // Update Invoice
      invoice.totalAmount = round2(Math.max(0, invoice.totalAmount - returnAmount));
      // Re-calculate running balance for the invoice
      invoice.totalDueAmount = round2(Math.max(0, invoice.totalAmount - (invoice.paidAmount || 0)));
      await invoice.save();

      customer.totalPurchase =
        round2(
          Math.max(
            0,
            customer.totalPurchase -
            returnAmount
          )
        );



      await customer.save();

      await recalcCustomer(customerId);
    }

    if (global.io && req.user) {
      global.io
        .to(String(req.user.id))
        .emit("dashboardUpdated");
    }

    const payment =
      await Payment.create({
        customerId,
        invoiceId: invoiceId || null,
        gstin,
        amount:
          type === "return"
            ? returnAmount
            : transactionAmount,
        type,
        paymentMode,
        reference,
        date: date
          ? new Date(date)
          : new Date(),
        customerName: customer.name,
        returnedProducts
      });

    if (type === "return") {

      await createLedgerEntry({
        customerId,

        date: payment.date,

        type: "return_advance",

        referenceId:
          payment._id,

        referenceNumber:
          reference || "",

        deductedAmount:
          returnAmount,

        notes:
          "Return adjusted against due"
      });

    }

    if (type === "payment") {

      await createLedgerEntry({
        customerId,

        date: payment.date,

        type:
          invoiceId
            ? "invoice_payment"
            : "payment",

        referenceId:
          payment._id,

        referenceNumber:
          reference || "",

        deductedAmount:
          transactionAmount,

        notes:
          invoiceId
            ? "Invoice payment received"
            : "Payment received"
      });

    }


    return res.status(201).json({
      success: true,
      message:
        type === "payment"
          ? "Payment recorded successfully"
          : "Return recorded successfully",
      payment
    });

  } catch (error) {

    console.error(
      "ADD PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Payments
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("customerId", "name gstin")
      .populate("invoiceId", "invoiceNumber")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Payment
exports.updatePayment = async (req, res) => {
  try {
    const { paymentMode, reference } = req.body;

    const existingPayment = await Payment.findById(req.params.id);

    if (!existingPayment) {
      return res.status(404).json({
        message: "Payment not found"
      });
    }

    existingPayment.paymentMode = paymentMode;
    existingPayment.reference = reference;

    await existingPayment.save();

    if (global.io) {
      global.io
        .to(String(req.user.id))
        .emit("dashboardUpdated");
    }

    res.json({
      message: "Payment updated successfully"
    });

  } catch (error) {
    console.error(
      "UPDATE PAYMENT ERROR:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });
  }
};