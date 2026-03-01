

const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
/* =====================
   AUTO CREATE ADMIN
===================== */
exports.createAdmin = async () => {
  const exists = await User.findOne({ role: "admin" });
  if (exists) return;

  const hashedPassword = await bcrypt.hash("@AAP", 10);

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
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Check required fields
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
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

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================
   LOGIN
===================== */
exports.login = async (req, res) => {
  console.log("Request Body:", req.body); 
  try {
    const { username, employeeId, password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    let user;

    const allUsers = await User.find();
console.log("All Users:", allUsers);

    if (username) {
      user = await User.findOne({ username, role: "admin" });
    } else if (employeeId) {
      user = await User.findOne({ employeeId, role: "employee" });
    } else {
      return res.status(400).json({ message: "Login field missing" });
    }

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account disabled" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================
   FORGOT PASSWORD (SEND RESET LINK)
===================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate raw token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before saving
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendEmail(
  user.email,
  "Reset Your Password - Anika Enterprises",
  `
  <div style="font-family: Arial, sans-serif; background-color:#f4f6f9; padding:40px 20px;">
    
    <div style="max-width:500px; margin:auto; background:white; padding:30px; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.1); text-align:center;">
      
<!-- LOGO -->
      <img src="https://anikaenterprise.in/logo.png" width="80" style="margin-bottom:15px;" />

      <!-- COMPANY NAME -->
      <h2 style="color:#01292f; margin-bottom:5px;">
        Anika Enterprises
      </h2>

      <p style="color:#555; margin-bottom:25px;">
        Ice Cream Wholesaler
      </p>

      <!-- PERSONAL GREETING -->
      <p style="font-size:15px; color:#333;">
        Hello ${user.username},
      </p>

      <p style="color:#666; font-size:14px;">
        We received a request to reset your password.
      </p>

      <a href="${resetUrl}" 
         style="
            display:inline-block;
            margin:25px 0;
            padding:14px 25px;
            background-color:#1d4ed8;
            color:white;
            text-decoration:none;
            border-radius:8px;
            font-weight:bold;
         ">
         Reset Password
      </a>

      <p style="font-size:13px; color:#888;">
        This link will expire in 15 minutes.
      </p>

      <hr style="margin:25px 0; border:none; border-top:1px solid #eee;" />

      <p style="font-size:12px; color:#aaa;">
        If you did not request this, please ignore this email.
      </p>

    </div>
  </div>
  `
);

    res.json({ message: "Reset link sent to email" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Email sending failed" });
  }
};

/* =====================
   RESET PASSWORD
===================== */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired link" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const admin = await User.findByIdAndUpdate(
      req.user.id,
      { email },
      { new: true }
    );

    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Profile updated",
      token
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

