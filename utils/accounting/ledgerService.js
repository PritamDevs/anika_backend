const LedgerEntry =
    require("../accounting/LedgerEntry");

const Customer =
    require("../../models/Customer");

const round2 = (v) =>
    Number(Number(v || 0).toFixed(2));

const createLedgerEntry = async ({
    customerId,
    date,
    type,
    referenceId,
    referenceNumber,
    addedAmount = 0,
    deductedAmount = 0,
    notes = ""
}) => {

    const customer =
        await Customer.findById(customerId);

    if (!customer) {
        throw new Error(
            "Customer not found"
        );
    }

    return LedgerEntry.create({
        customerId,
        date,
        type,
        referenceId,
        referenceNumber,

        addedAmount:
            round2(addedAmount),

        deductedAmount:
            round2(deductedAmount),

        runningDue:
            round2(customer.dueAmount),

        runningAdvance:
            round2(customer.advanceAmount),

        notes
    });

};

module.exports = {
    createLedgerEntry
};