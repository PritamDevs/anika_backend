const cron = require("node-cron");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
// Expense is NOT imported — expenses are standalone, no customerId, never touch them

const getCurrentAccountingYearStart = () => {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const accountingYearStartYear = month < 3 ? year - 1 : year;
  return new Date(accountingYearStartYear, 3, 1);
};

const cleanupDeletedCustomerData = async () => {
  try {
    console.log("🧹 Running annual cleanup for deleted customers...");

    const accountingYearStart = getCurrentAccountingYearStart();

    // Step 1: Find soft-deleted customers from BEFORE the current accounting year
    const deletedCustomers = await Customer.find({
      isActive: false,
      deletedAt: { $lt: accountingYearStart },
    });

    if (deletedCustomers.length === 0) {
      console.log("ℹ️ No deleted customers found for cleanup.");
      return;
    }

    const deletedCustomerIds = deletedCustomers.map((c) => c._id);
    console.log(`\n👥 Found ${deletedCustomers.length} deleted customer(s):`);
    deletedCustomers.forEach((c) =>
      console.log(`   - ${c.name} (deleted: ${c.deletedAt?.toDateString()})`)
    );

    // Step 2: Delete all payments and returns linked to these customers
    // Payment model has customerId directly — covers both type: "payment" and type: "return"
    const paymentResult = await Payment.deleteMany({
      customerId: { $in: deletedCustomerIds },
    });
    console.log(`\n💳 Payments/Returns deleted: ${paymentResult.deletedCount}`);

    // Step 3: Delete all invoices linked to these customers
    const invoiceResult = await Invoice.deleteMany({
      customerId: { $in: deletedCustomerIds },
    });
    console.log(`🧾 Invoices deleted: ${invoiceResult.deletedCount}`);

    // Step 4: Permanently delete the customer records themselves
    const customerResult = await Customer.deleteMany({
      _id: { $in: deletedCustomerIds },
    });
    console.log(`👤 Customers permanently deleted: ${customerResult.deletedCount}`);

    console.log("\n✅ Cleanup complete.");
    console.log("   Expenses untouched — standalone records, not linked to any customer.");
    console.log("   All active customer data is fully safe.");
  } catch (err) {
    console.error("❌ Cleanup error:", err);
  }
};

// Runs every April 1st at midnight
const scheduleCleanup = () => {
  cron.schedule("0 0 1 4 *", async () => {
    console.log("⏰ Cron triggered: Annual cleanup (April 1st)");
    await cleanupDeletedCustomerData();
  });

  console.log("📅 Cleanup cron scheduled: Runs every April 1st at midnight");
};

module.exports = { scheduleCleanup, cleanupDeletedCustomerData };