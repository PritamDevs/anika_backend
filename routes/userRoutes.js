const express = require("express");
const router = express.Router();

const { createEmployee } = require("../controllers/userController");

const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.post(
  "/create-employee",
  auth,
  authorize("admin"),
  createEmployee
);

module.exports = router;
