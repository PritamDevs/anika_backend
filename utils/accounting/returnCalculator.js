const round2 = (v) =>
    Number(Number(v || 0).toFixed(2));

const calculateReturnAmount = (
    invoice,
    returnedProducts
) => {

    let returnAmount = 0;

    const enrichedProducts = [];

    for (const returnedItem of returnedProducts) {

        const soldItem =
            invoice.products.find(
                p =>
                    p.productId.toString() ===
                    returnedItem.productId.toString()
            );

        if (!soldItem) {
            throw new Error(
                `${returnedItem.productName} was not sold in this invoice`
            );
        }

        const rate =
            Number(soldItem.rate || 0);

        const discount =
            Number(soldItem.discount || 0);

        const effectiveRate =
            round2(
                rate -
                ((rate * discount) / 100)
            );

        const itemAmount =
            Number(returnedItem.qty) *
            effectiveRate;

        returnAmount += itemAmount;

        enrichedProducts.push({
            productId:
                returnedItem.productId,

            productName:
                returnedItem.productName,

            qty:
                Number(returnedItem.qty),

            rate: effectiveRate,

            amount:
                round2(itemAmount)
        });
    }

    return {
        returnAmount:
            round2(returnAmount),

        enrichedProducts
    };
};

module.exports = {
    calculateReturnAmount
};