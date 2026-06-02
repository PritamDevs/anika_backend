const Customer =
    require("../models/Customer");

const {
    calculateBalance
} = require(
    "./accounting/customerAccounting"
);

const recalcCustomer =
    async (customerId) => {

        const customer =
            await Customer.findById(
                customerId
            );

        if (!customer) return;

        const totalPurchase =
            customer.totalPurchase || 0;

        const totalPaid =
            customer.totalPaid || 0;

        const openingBalance =
            customer.openingBalance || 0;

        const {
            dueAmount,
            advanceAmount
        } = calculateBalance({
            totalPurchase,
            totalPaid,
            openingBalance
        });

        await Customer.findByIdAndUpdate(
            customerId,
            {
                dueAmount,
                advanceAmount
            }
        );
    };

module.exports =
    recalcCustomer;