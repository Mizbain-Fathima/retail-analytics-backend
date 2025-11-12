// backend/server.js
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import redisClient from "./config/redis.js";
import inventoryRoutes from "./routes/inventory.js";
import analyticsRoutes from "./routes/analytics.js";
import alertRoutes from "./routes/alerts.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------
// CORS Configuration (Fixed)
// -----------------------------
const allowedOrigins = [
  "http://localhost:5173",             // Vite local dev
  "http://localhost:4173",             // Vite preview
  "https://retail-analytics-frontend-1s00.onrender.com"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow server-to-server or curl
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn("❌ Blocked CORS for origin:", origin);
      return callback(new Error("CORS not allowed"), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// -----------------------------
// 🚦 Rate Limiting
// -----------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // limit each IP
  message: "Too many requests, please try again later."
});
app.use(limiter);

// -----------------------------
// Middleware
// -----------------------------
app.use(express.json());

// -----------------------------
// Routes
// -----------------------------
app.use("/api/inventory", inventoryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/alerts", alertRoutes);

// -----------------------------
// Health Check Route
// -----------------------------
app.get("/health", async (req, res) => {
  try {
    await redisClient.ping();
    res.json({
      status: "OK",
      database: "Connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      database: "Disconnected",
      error: error.message
    });
  }
});

// -----------------------------
// Global Error Handler
// -----------------------------
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message
  });
});

// -----------------------------
// Start Server
// -----------------------------
async function startServer() {
  try {
    await redisClient.connect();
    console.log("✅ Connected to Redis Cloud");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📦 Inventory API: http://localhost:${PORT}/api/inventory`);
      console.log(`📈 Analytics API: http://localhost:${PORT}/api/analytics`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
