const round2 = (value) =>
    Number(Number(value).toFixed(2));

exports.calculateCustomerBalance = (
    totalPurchase,
    totalPaid
) => {

    const balance = round2(
        totalPurchase - totalPaid
    );

    // Customer owes company
    if (balance >= 0) {
        return {
            dueAmount: balance,
            advanceAmount: 0
        };
    }

    // Company owes customer
    return {
        dueAmount: 0,
        advanceAmount: Math.abs(balance)
    };
};