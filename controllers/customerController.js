const Customer = require("../models/Customer");

// ➕ CREATE CUSTOMER
exports.createCustomer = async (req, res) => {
  try {
    const { name, contact, address, totalPurchase, paid } = req.body;

    if (!name || !contact) {
      return res.status(400).json({ message: "Name and contact are required" });
    }

    const total = Number(totalPurchase) || 0;
const totalPaid = Number(paid) || 0;

    const rawDue = total - totalPaid;

    const customer = await Customer.create({
      name,
      contact,
      address,
      totalPurchase: total,
      totalPaid: totalPaid,
      dueAmount :Number(Math.max(rawDue, 0).toFixed(2))
    });

    res.status(201).json({
      message: "Customer created successfully",
      customer
    });
  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 📄 GET ALL CUSTOMERS
exports.getAllCustomers = async (req, res) => {
  try {
   const customers = await Customer.find({ isActive: true })
  .sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✏️ UPDATE CUSTOMER
// ✏️ UPDATE CUSTOMER (FIXED & SAFE)
exports.updateCustomer = async (req, res) => {
  try {
    const { name, contact, address, totalPurchase, paid } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (contact !== undefined) updates.contact = contact;
    if (address !== undefined) updates.address = address;

    if (totalPurchase !== undefined) {
      updates.totalPurchase = Number(totalPurchase);
    }

    if (paid !== undefined) {
      updates.totalPaid = Number(paid);
    }

    // calculate due ONLY if values exist
    if (totalPurchase !== undefined || paid !== undefined) {
      const customer = await Customer.findById(req.params.id);
      const finalTotal = totalPurchase ?? customer.totalPurchase;
      const finalPaid = paid ?? customer.totalPaid;

      const rawDue = finalTotal - finalPaid;
      updates.dueAmount = Number(Math.max(rawDue, 0).toFixed(2));
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({
      message: "Customer updated successfully",
      customer: updatedCustomer
    });
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ❌ DELETE CUSTOMER
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer marked as inactive" });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};