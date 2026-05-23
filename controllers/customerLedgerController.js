const {
    buildCustomerLedger
} = require("../services/customerLedgerService");

const Customer =
    require("../models/Customer");

const {
    recalculateCustomer
} = require("../services/customerRecalculateService");


const getCustomerLedger = async (req, res) => {

    try {

        const { id } = req.params;

        const data =
            await buildCustomerLedger(id);

        res.json(data);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });
    }
};

const recalculateCustomerLedger =
    async (req, res) => {

        try {

            const { id } = req.params;

            const result =
                await recalculateCustomer(id);

            res.json(result);

        } catch (error) {

            res.status(500).json({
                message: error.message
            });
        }
    };

const updatePreviousDue =
    async (req, res) => {

        try {

            const { id } = req.params;

            const {
                manualAdjustment
            } = req.body;

            const customer =
                await Customer.findByIdAndUpdate(
                    id,
                    {
                        manualAdjustment:
                            Number(manualAdjustment)
                    },
                    {
                        new: true
                    }
                );

            res.json(customer);

        } catch (error) {

            res.status(500).json({
                message: error.message
            });
        }
    };


module.exports = {getCustomerLedger,updatePreviousDue,recalculateCustomerLedger};