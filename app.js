
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const { createAdmin } = require("./controllers/authController");
const invoiceRoutes = require("./routes/invoiceRoutes");
const customerRoutes = require("./routes/customerRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const reportRoutes = require("./routes/reportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const morgan = require("morgan");
const helmet = require("helmet");


const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { scheduleCleanup } = require("./utils/cleanup");

const app = express();
const server = http.createServer(app);

// 🔍 DEBUG: check if env is loading
console.log("MONGO_URI:", process.env.MONGO_URI);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://anikaenterprise.in"
    ],
    methods: ["GET", "POST"]
  }
});

global.io = io;

// 🔌 SOCKET.IO
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  let userId = socket.handshake.auth?.userId;

  if (!userId) {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id || decoded._id;
    } catch {
      console.log("Invalid token, disconnecting socket");
      return socket.disconnect();
    }
  }

  socket.join(userId);
  console.log("User joined room:", userId);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// 🛡️ MIDDLEWARE
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://anikaenterprise.in"
  ],
  credentials: true
}));

// 📌 ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 🏠 ROOT
app.get("/", (req, res) => {
  res.send("Anika Enterprises API Running");
});

// 🚀 SERVER START
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    await createAdmin();
    scheduleCleanup();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
  });