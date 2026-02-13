// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   employeeId: {
//     type: String,
//     unique: true,
//     sparse: true // allows null for admin
//   },
//   password: {
//     type: String,
//     required: true
//   },
//   role: {
//     type: String,
//     enum: ["admin", "employee"],
//     required: true
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model("user", userSchema);
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    // ADMIN
    username: {
      type: String,
      unique: true,
      sparse: true
    },

    email: {
      type: String,
      unique: true,
      sparse: true
    },

    // EMPLOYEE
    employeeId: {
      type: String,
      unique: true,
      sparse: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["admin", "employee"],
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

    // FORGOT PASSWORD
    otp: String,
    otpExpiry: Date,
    resetToken: String,
    resetTokenExpiry: Date,
    resetOTP: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("user", userSchema);
