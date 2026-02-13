const express = require("express");
const auth = require("../middleware/authMiddleware");
const router = express.Router();
const { login, forgotPassword,
  verifyOtp,
  resetPassword, updateProfile } = require("../controllers/authController");

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

router.put("/admin/profile",  auth, updateProfile);


module.exports = router;
