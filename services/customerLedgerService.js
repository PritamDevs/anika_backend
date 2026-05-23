const Customer = require("../../anika_backend/models/Customer");
const Invoice = require("../../anika_backend/models/Invoice");
const Payment = require("../../anika_backend/models/Payment");

const buildCustomerLedger = async (customerId) => {

    const customer = await Customer.findById(customerId);

    if (!customer) {
        throw new Error("Customer not found");
    }

    const invoice = await Invoice.findOne();

    console.log(invoice);

    const invoices = await Invoice.find({
        customerId: customerId
    }).sort({ createdAt: 1 });

    const ledger = [];

    // Opening balance
    if (Number(customer.manualAdjustment || 0) > 0) {

        ledger.push({
            date: customer.createdAt,
            type: "OPENING_BALANCE",
            ref: "OB",
            debit: Number(customer.manualAdjustment),
            credit: 0
        });
    }

    // Invoices + payments
    for (const invoice of invoices) {

        ledger.push({
            date: invoice.createdAt,
            type: "INVOICE",
            ref: invoice.invoiceNumber,
            debit: Number(invoice.totalAmount || 0),
            credit: 0
        });

        if (invoice.payments?.length) {

            for (const payment of invoice.payments) {

                ledger.push({
                    date: payment.createdAt,
                    type: "PAYMENT",
                    ref: payment.paymentNumber || "PAY",
                    debit: 0,
                    credit: Number(payment.amount || 0)
                });
            }
        }

        // advance used
        if (Number(invoice.advanceAmount || 0) > 0) {

            ledger.push({
                date: invoice.createdAt,
                type: "ADVANCE_USED",
                ref: invoice.invoiceNumber,
                debit: 0,
                credit: Number(invoice.advanceUsed)
            });
        }

        if (Number(invoice.paidAmount || 0) > 0) {

            ledger.push({
                date: invoice.createdAt,
                type: "PAYMENT",
                ref: invoice.invoiceNumber,
                debit: 0,
                credit: Number(invoice.paidAmount)
            });
        }
    }

    // sort chronologically
    ledger.sort(
        (a, b) =>
            new Date(a.date) - new Date(b.date)
    );

    // running balance
    let runningBalance = 0;

    const finalLedger = ledger.map((entry) => {

        runningBalance += entry.debit;
        runningBalance -= entry.credit;

        return {
            ...entry,
            runningBalance
        };
    });

    return {
        customer,
        ledger: finalLedger
    };
};

module.exports = {
    buildCustomerLedger
};