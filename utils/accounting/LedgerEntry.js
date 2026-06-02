const mongoose = require("mongoose");

const ledgerEntrySchema =
    new mongoose.Schema(
        {
            customerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Customer",
                required: true
            },

            date: {
                type: Date,
                required: true
            },

            type: {
                type: String,
                enum: [
                    "opening_balance",
                    "invoice",
                    "invoice_payment",
                    "payment",
                    "return_cash",
                    "return_advance"
                ],
                required: true
            },

            referenceId: {
                type: mongoose.Schema.Types.ObjectId
            },

            referenceNumber: {
                type: String
            },

            addedAmount: {
                type: Number,
                default: 0
            },

            deductedAmount: {
                type: Number,
                default: 0
            },

            runningDue: {
                type: Number,
                default: 0
            },

            runningAdvance: {
                type: Number,
                default: 0
            },

            notes: {
                type: String,
                default: ""
            }
        },
        {
            timestamps: true
        }
    );

module.exports =
    mongoose.model(
        "LedgerEntry",
        ledgerEntrySchema
    );