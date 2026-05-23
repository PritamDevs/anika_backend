const mongoose = require("mongoose");
const Customer = require("./models/Customer");
const Invoice = require("./models/Invoice");

require("dotenv").config();

mongoose.connect(process.env.MONGO_URI);

async function fixCustomerRollingBalance() {

    const customers = await Customer.find();

    for (const customer of customers) {

        const latestInvoice = await Invoice.findOne({
            customerId: customer._id
        }).sort({ createdAt: -1 });

        if (!latestInvoice) continue;

        await Customer.findByIdAndUpdate(customer._id, {
            totalPurchase: latestInvoice.totalAmount || 0,
            totalPaid: latestInvoice.paidAmount || 0,
            dueAmount: latestInvoice.totalDueAmount || 0
        });

        console.log(
            customer.name,
            latestInvoice.totalDueAmount
        );
    }

    console.log("Rolling balances restored");
    process.exit();
}

fixCustomerRollingBalance();