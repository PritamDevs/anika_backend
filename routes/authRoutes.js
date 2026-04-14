const express = require("express");
const auth = require("../middleware/authMiddleware");
const router = express.Router();
const { register,login, forgotPassword,
  verifyOtp,
  resetPassword, updateProfile } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/forgotPassword", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.put("/admin/profile",  auth, updateProfile);


module.exports = router;
