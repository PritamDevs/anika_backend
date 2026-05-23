const mongoose = require("mongoose");
const Invoice = require("./models/Invoice");
const Customer = require("./models/Customer");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const customers = await Customer.find({});

    for (const cust of customers) {
        const invoices = await Invoice.find({ customerId: cust._id });
        const totalPurchase = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const correctDue = Math.max(0, totalPurchase - totalPaid);

        if (cust.dueAmount !== correctDue) {
            console.log(cust.name + " | Current: " + cust.dueAmount + " | Correct: " + correctDue);
        }
    }

    console.log("Dry run complete - nothing was changed");
    mongoose.disconnect();
});