const Customer = require("../models/Customer");

const round2 = (v) =>
    Number(Number(v || 0).toFixed(2));

const recalcCustomer = async (customerId) => {
    const customer = await Customer.findById(customerId);

    if (!customer) return;

    const totalPurchase =
        round2(customer.totalPurchase || 0);

    const totalPaid =
        round2(customer.totalPaid || 0);

    const openingBalance =
        round2(customer.openingBalance || 0);

    const balance =
        round2(
            totalPaid
            -
            totalPurchase
            -
            openingBalance
        );

    const dueAmount =
        balance < 0
            ? round2(Math.abs(balance))
            : 0;

    const advanceAmount =
        balance > 0
            ? round2(balance)
            : 0;

    await Customer.findByIdAndUpdate(
        customerId,
        {
            dueAmount,
            advanceAmount
        }
    );
};

module.exports = recalcCustomer;