const round2 = (v) =>
    Number(Number(v || 0).toFixed(2));

const calculateBalance = ({
    totalPurchase = 0,
    totalPaid = 0,
    openingBalance = 0
}) => {

    const balance = round2(
        totalPaid -
        totalPurchase -
        openingBalance
    );

    return {
        dueAmount:
            balance < 0
                ? round2(Math.abs(balance))
                : 0,

        advanceAmount:
            balance > 0
                ? round2(balance)
                : 0
    };
};

module.exports = {
    calculateBalance
};