// const User = require("../models/user");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// exports.createAdmin = async () => {
//   const adminExists = await User.findOne({ role: "admin" });
//   if (adminExists) return;

//   const hashedPassword = await bcrypt.hash("admin123", 10);

//   await User.create({
//     name: "Admin",
//     password: hashedPassword,
//     role: "admin"
//   });
// };

// exports.login = async (req, res) => {
//   try {
//     console.log("Request Body:", req.body); // DEBUG LINE

//     const password = req.body?.password;
//     const employeeId = req.body?.employeeId;

//     if (!password) {
//       return res.status(400).json({ message: "Password is required" });
//     }

//     let user;

//     // EMPLOYEE LOGIN
//     if (employeeId) {
//       user = await User.findOne({ employeeId, role: "employee" });
//     } 
//     // ADMIN LOGIN
//     else {
//       user = await User.findOne({ role: "admin" });
//     }

//     if (!user) {
//       return res.status(400).json({ message: "User not found" });
//     }

//     if (!user.isActive) {
//       return res.status(403).json({ message: "Account is disabled" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.json({
//       token,
//       role: user.role,
//       name: user.name
//     });

//   } catch (error) {
//     console.error("Login Error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// const User = require("../models/user");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const crypto = require("crypto");
// const sendEmail = require("../utils/sendEmail");

// /* =====================
//    AUTO CREATE ADMIN
// ===================== */
// exports.createAdmin = async () => {
//   const exists = await User.findOne({ role: "admin" });
//   if (exists) return;

//   const hashedPassword = await bcrypt.hash("admin123", 10);

//   await User.create({
//     name: "Admin",
//     username: "admin",
//     email: "admin@gmail.com",
//     password: hashedPassword,
//     role: "admin"
//   });

//   console.log("✅ Admin created");
// };

// /* =====================
//    LOGIN
// ===================== */
// exports.login = async (req, res) => {
//   try {
//     const { username, employeeId, password } = req.body;

//     if (!password) {
//       return res.status(400).json({ message: "Password is required" });
//     }

//     let user;

//     if (username) {
//       user = await User.findOne({ username, role: "admin" });
//     } else if (employeeId) {
//       user = await User.findOne({ employeeId, role: "employee" });
//     } else {
//       return res.status(400).json({ message: "Login field missing" });
//     }

//     if (!user) {
//       return res.status(400).json({ message: "User not found" });
//     }

//     if (!user.isActive) {
//       return res.status(403).json({ message: "Account disabled" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.json({
//       token,
//       role: user.role,
//       name: user.name
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* =====================
//    FORGOT PASSWORD (SEND OTP)
// ===================== */
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     const admin = await User.findOne({ email, role: "admin" });
//     if (!admin) {
//       return res.status(404).json({ message: "Admin not found" });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     admin.otp = otp;
//     admin.otpExpiry = Date.now() + 10 * 60 * 1000;
//     await admin.save();

//     await sendEmail(
//       admin.email,
//       "OTP for Password Reset",
//       `
//         <h3>Password Reset OTP</h3>
//         <h2>${otp}</h2>
//         <p>This OTP is valid for 10 minutes.</p>
//       `
//     );

//     res.json({ message: "OTP sent to email" });
//   } catch {
//     res.status(500).json({ message: "Email sending failed" });
//   }
// };

// /* =====================
//    VERIFY OTP
// ===================== */
// exports.verifyOtp = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     const admin = await User.findOne({
//       email,
//       role: "admin",
//       otp,
//       otpExpiry: { $gt: Date.now() }
//     });

//     if (!admin) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     const resetToken = crypto.randomBytes(32).toString("hex");

//     admin.resetToken = resetToken;
//     admin.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
//     admin.otp = undefined;
//     admin.otpExpiry = undefined;

//     await admin.save();

//     res.json({
//       message: "OTP verified",
//       resetToken
//     });
//   } catch {
//     res.status(500).json({ message: "OTP verification failed" });
//   }
// };

// /* =====================
//    RESET PASSWORD
// ===================== */
// exports.resetPassword = async (req, res) => {
//   try {
//     const { token, newPassword } = req.body;

//     const admin = await User.findOne({
//       resetToken: token,
//       resetTokenExpiry: { $gt: Date.now() }
//     });

//     if (!admin) {
//       return res.status(400).json({ message: "Invalid or expired token" });
//     }

//     admin.password = await bcrypt.hash(newPassword, 10);
//     admin.resetToken = undefined;
//     admin.resetTokenExpiry = undefined;

//     await admin.save();

//     res.json({ message: "Password reset successful" });
//   } catch {
//     res.status(500).json({ message: "Server error" });
//   }
// };

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

  const hashedPassword = await bcrypt.hash("admin123", 10);

  await User.create({
    name: "Admin",
    username: "admin",
    email: "admin@gmail.com",
    password: hashedPassword,
    role: "admin",
    isActive: true
  });

  console.log("✅ Admin created");
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
      { id: user._id, email:user.email, role: user.role ,username: "admin" },
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
   FORGOT PASSWORD (SEND OTP)
===================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    admin.otp = otp;
    admin.otpExpiry = Date.now() + 10 * 60 * 1000;
    await admin.save();

    await sendEmail(
      admin.email,
      "OTP for Password Reset",
      `
        <h3>Password Reset OTP</h3>
        <h2>${otp}</h2>
        <p>This OTP is valid for 10 minutes.</p>
      `
    );

    res.json({ message: "OTP sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Email sending failed" });
  }
};

/* =====================
   VERIFY OTP
===================== */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const admin = await User.findOne({
      email,
      role: "admin",
      otp,
      otpExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    admin.resetToken = resetToken;
    admin.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    admin.otp = undefined;
    admin.otpExpiry = undefined;

    await admin.save();

    res.json({
      message: "OTP verified",
      resetToken
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "OTP verification failed" });
  }
};

/* =====================
   RESET PASSWORD
===================== */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const admin = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    admin.resetToken = undefined;
    admin.resetTokenExpiry = undefined;

    await admin.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const admin = await Admin.findByIdAndUpdate(
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

