const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");

const recalculateCustomer = async (
    customerId
) => {

    // get customer
    const customer =
        await Customer.findById(customerId);

    if (!customer) {
        throw new Error("Customer not found");
    }

    // get all invoices oldest -> newest
    const invoices = await Invoice.find({
        customerId: customerId
    })
        .sort({ createdAt: 1 });

    // previous/manual due before ERP
    let runningBalance =
        Number(customer.manualAdjustment || 0);

    // loop invoices
    for (const invoice of invoices) {

        const totalAmount =
            Number(invoice.totalAmount || 0);

        const paidAmount =
            Number(invoice.paidAmount || 0);

        const advanceUsed =
            Number(
                invoice.advanceUsed ||
                invoice.advanceAmount ||
                0
            );

        // ADD invoice amount
        runningBalance += totalAmount;

        // SUBTRACT payments
        runningBalance -= paidAmount;

        // SUBTRACT advance used
        runningBalance -= advanceUsed;

        // FINAL invoice due
        const invoiceDue =
            Math.max(
                totalAmount -
                paidAmount -
                advanceUsed,
                0
            );

        // payment status
        let paymentStatus = "UNPAID";

        if (
            paidAmount + advanceUsed >= totalAmount
        ) {

            paymentStatus = "PAID";

        } else if (
            paidAmount > 0 ||
            advanceUsed > 0
        ) {

            paymentStatus = "PARTIAL";
        }

        console.log({
            invoice: invoice.invoiceNumber,
            totalAmount,
            paidAmount,
            advanceUsed,
            invoiceDue,
            runningBalance
        });

        // update invoice
        await Invoice.findByIdAndUpdate(
            invoice._id,
            {
                totalDueAmount:
                    invoiceDue,

                recalculatedRunningBalance:
                    runningBalance,

                paymentStatus
            }
        );
    }

    // update customer final due
    await Customer.findByIdAndUpdate(
        customerId,
        {
            dueAmount:
                runningBalance > 0
                    ? runningBalance
                    : 0,

            advanceAmount:
                runningBalance < 0
                    ? Math.abs(runningBalance)
                    : 0
        }
    );

    return {
        success: true,
        customerId,
        finalDue: runningBalance,
        totalInvoices: invoices.length
    };
};

module.exports = {
    recalculateCustomer
};