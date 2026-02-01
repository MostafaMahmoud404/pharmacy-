require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require('path');
const connectDB = require("./config/database");
const { initializeSocket } = require("./config/socket");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Connect Database
connectDB();

// ✅ CORS Configuration - Fixed
const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
};

// Apply CORS
app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request Logger (للتطوير)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Test Route
app.get("/", (req, res) => {
  res.json({
    message: "🏥 Pharmacy API is running",
    version: "1.0.0",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:4200",
  });
});

// Static files - MUST be before routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/cart", require("./routes/cartRoutes"));
app.use("/api/v1/users", require("./routes/userRoutes"));
app.use("/api/v1/doctors", require("./routes/doctorRoutes"));
app.use("/api/v1/products", require("./routes/productRoutes"));
app.use("/api/v1/prescriptions", require("./routes/prescriptionRoutes"));
app.use("/api/v1/orders", require("./routes/orderRoutes"));
app.use("/api/v1/consultations", require("./routes/consultationRoutes"));
app.use("/api/v1/reviews", require("./routes/reviewRoutes"));
app.use("/api/v1/payments", require("./routes/paymentRoutes"));
app.use("/api/v1/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/v1/admin", require("./routes/adminRoutes"));
app.use("/api/v1/pharmacies", require("./routes/pharmacyRoutes"));

// 404 Handler
const { notFound, errorHandler } = require("./middleware/errorHandler");
app.use(notFound);

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server is ready`);
  console.log(`✅ CORS enabled for: ${allowedOrigins.join(", ")}`);
});
