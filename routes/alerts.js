import express from "express";
const router = express.Router();
import redisClient from "../config/redis.js";

async function calculateOEEForProduct(product) {
  const qty = Number(product.qty);
  const max_capacity = Number(product.max_capacity);

  const availability = (qty / max_capacity) * 100;
  const utilization = qty / max_capacity;
  const performance = 80 + (1 - utilization) * 15; // 80–95%
  const quality = 85 + Math.random() * 10; // 85–95%
  const overall = (availability * performance * quality) / 10000;

  return {
    sku: product.sku,
    availability: Number(availability.toFixed(2)),
    performance: Number(performance.toFixed(2)),
    quality: Number(quality.toFixed(2)),
    overall: Number(overall.toFixed(2)),
    timestamp: new Date(),
  };
}

router.get("/", async (req, res) => {
  try {
    const keys = await redisClient.keys("inventory:*");
    const alerts = [];

    for (const key of keys) {
      const product = await redisClient.hGetAll(key);
      const oee = await calculateOEEForProduct(product);

      // 🧮 LOW_OEE Alerts
      let severity = "MEDIUM";
      if (oee.overall < 50) severity = "CRITICAL";
      else if (oee.overall < 70) severity = "HIGH";

      if (oee.overall < 70) {
        alerts.push({
          type: "LOW_OEE",
          message: `${product.name} has low OEE (${oee.overall.toFixed(2)}%)`,
          severity,
          timestamp: new Date(),
        });
      }

      // 📉 LOW_STOCK Alerts
      const qty = Number(product.qty);
      const threshold = Number(product.threshold);

      if (qty <= threshold) {
        let stockSeverity = "MEDIUM";
        if (qty <= threshold / 2) stockSeverity = "HIGH";
        if (qty <= threshold / 4) stockSeverity = "CRITICAL";

        alerts.push({
          type: "LOW_STOCK",
          message: `${product.name} stock is low (${qty}/${threshold})`,
          severity: stockSeverity,
          timestamp: new Date(),
        });
      }
    }

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error("❌ Error fetching alerts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch alerts" });
  }
});

export default router;
