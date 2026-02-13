const User = require("../models/user");
const bcrypt = require("bcryptjs");

exports.createEmployee = async (req, res) => {
  const { name, employeeId, password } = req.body;

  const exists = await User.findOne({ employeeId });
  if (exists)
    return res.status(400).json({ message: "Employee ID already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const employee = await User.create({
    name,
    employeeId,
    password: hashedPassword,
    role: "employee"
  });

  res.json({ message: "Employee created", employee });
};
