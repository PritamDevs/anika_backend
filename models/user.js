
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    
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

    role: {
      type: String,
      enum: ["admin", "employee"],
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    },
    password: {
    type: String,
    required: true,
    minlength: 6
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
