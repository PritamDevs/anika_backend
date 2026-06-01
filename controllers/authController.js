const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

/* =====================
   AUTO CREATE ADMIN
===================== */
exports.createAdmin = async () => {
  const exists = await User.findOne({ role: "admin" });
  if (exists) return;

  const hashedPassword =
    await bcrypt.hash(
      process.env.DEFAULT_ADMIN_PASSWORD,
      10
    );
    
  await User.create({
    name: "Anika Enterprise",
    username: "Anika Enterprise",
    email: "admin@gmail.com",
    password: hashedPassword,
    role: "admin",
    isActive: true
  });

  console.log("✅ Admin created");
};
/* =====================
   REGISTER
===================== */
exports.register = asyncHandler(async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    // Check required fields
    if (!username || !email || !password || !confirmPassword) {
      throw new AppError(
        "All fields are required",
        400
      );
    }

    // Check password match
    if (password !== confirmPassword) {
      throw new AppError(
        "Passwords do not match",
        400
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new AppError(
        "User already exists",
        400
      );
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await User.create({
      username,
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    res.status(201).json({
      message: "User registered successfully",
    });
  });

/* =====================
   LOGIN
===================== */
exports.login = asyncHandler(async (req, res) => {
  // console.log("Request Body:", req.body); 
    const { username, employeeId, password } = req.body;

    if (!password) {
      throw new AppError(
        "Password is required",
        400
      );
    }

    let user;

// console.log("All Users:", allUsers);

    if (username) {
      user = await User.findOne({ username, role: "admin" });
    } else if (employeeId) {
      user = await User.findOne({ employeeId, role: "employee" });
    } else {
      throw new AppError(
        "Login field missing",
        400
      );
    }

    if (!user) {
      throw new AppError(
        "Invalid credentials",
        401
      );
    }

    if (!user.isActive) {
      throw new AppError(
        "Account disabled",
        403
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError(
        "Invalid credentials",
        400
      );
    }

    const token = jwt.sign(
      { id: user._id, email:user.email, role: user.role ,username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      name: user.name
    });
});
