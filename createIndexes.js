require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URL).then(async () => {
  const db = mongoose.connection.db;

  await db.collection("products").createIndex({ name: 1 });
  await db.collection("customers").createIndex({ name: 1, isActive: 1, user: 1 });
  await db.collection("invoices").createIndex({ createdAt: -1 });
  await db.collection("invoices").createIndex({ createdBy: 1 });
  await db.collection("payments").createIndex({ date: -1, user: 1 });
  await db.collection("expenses").createIndex({ date: -1, user: 1 });

  console.log("✅ All indexes created successfully");
  process.exit();
});