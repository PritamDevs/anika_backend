const Customer = require("../models/Customer");

// CREATE CUSTOMER
exports.createCustomer = async (req, res) => {
  try {
    const { name, contact, address, totalPurchase, paid } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const total = Number(totalPurchase) || 0;
    const totalPaid = Number(paid) || 0;
    const rawDue = total - totalPaid;

    let customer;

    // ✅ CASE 1: If contact exists → avoid duplicate
    if (contact && contact.trim() !== "") {
      customer = await Customer.findOneAndUpdate(
        {
          contact: contact,
          user: req.user.id
        },
        {
          $setOnInsert: {
            name,
            contact,
            address,
            totalPurchase: total,
            totalPaid: totalPaid,
            dueAmount: Number(Math.max(rawDue, 0).toFixed(2)),
            user: req.user.id
          }
        },
        {
          new: true,
          upsert: true
        }
      );
    } 
    // ✅ CASE 2: No contact → ALWAYS create new customer
    else {
      customer = await Customer.create({
        name,
        contact: "N/A",
        address,
        totalPurchase: total,
        totalPaid: totalPaid,
        dueAmount: Number(Math.max(rawDue, 0).toFixed(2)),
        user: req.user.id
      });
    }

    if (global.io) {
      global.io.to(String(req.user.id)).emit("customerUpdated");
    }

    res.status(201).json({
      message: "Customer created successfully",
      customer
    });

  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL CUSTOMERS
exports.getAllCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = {
      isActive: true,
      user: req.user.id,
      ...(search && { name: { $regex: search, $options: "i" } })
    };

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ name: 1 })
      .collation({ locale: "en", strength: 2 })
      .skip(skip)
      .limit(limit);

    res.json({
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { name, contact, address, totalPurchase, paid } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (contact !== undefined) updates.contact = contact;
    if (address !== undefined) updates.address = address;

    // Single DB fetch instead of two
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    if (totalPurchase !== undefined) updates.totalPurchase = Number(totalPurchase);

    if (paid !== undefined) {
      const newPaid = Number(paid);
      const adjustment = newPaid - customer.totalPaid;
      updates.totalPaid = newPaid;
      updates.manualAdjustment = (customer.manualAdjustment || 0) + adjustment;
    }

    if (totalPurchase !== undefined || paid !== undefined) {
      const finalTotal = totalPurchase !== undefined ? Number(totalPurchase) : customer.totalPurchase;
      const finalPaid  = paid !== undefined         ? Number(paid)          : customer.totalPaid;
      updates.dueAmount = Number(Math.max(finalTotal - finalPaid, 0).toFixed(2));
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (global.io) global.io.to(String(req.user.id)).emit("customerUpdated");

    res.json({ message: "Customer updated successfully", customer: updatedCustomer });
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// DELETE CUSTOMER
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false,
        deletedAt: new Date()
      },
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

exports.getAllCustomersList = async (req, res) => {
  try {
    const customers = await Customer.find( { user: req.user.id }, "name contact address dueAmount");
    res.json({ customers });
  } catch (error) {
    console.error("GET ALL CUSTOMERS LIST ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};