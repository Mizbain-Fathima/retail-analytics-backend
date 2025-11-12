import express from "express";
const router = express.Router();
import redisClient from "../config/redis.js";

router.get("/oee", async (req, res) => {
  try {
    const keys = await redisClient.keys("inventory:*");
    const products = [];

    for (const key of keys) {
      const product = await redisClient.hGetAll(key);

      const qty = Number(product.qty);
      const max_capacity = Number(product.max_capacity);

      const availability = (qty / max_capacity) * 100;

      // 🧠 Performance depends on how utilized the product is
      const utilization = qty / max_capacity;
      const performance = 80 + (1 - utilization) * 15; // Range 80–95%

      // 🎯 Quality simulated between 85–100%
      const quality = 85 + Math.random() * 10;

      // ⚙️ Compute overall OEE
      const overall = (availability * performance * quality) / 10000;

      products.push({
        ...product,
        oee: {
          sku: product.sku,
          availability: Number(availability.toFixed(2)),
          performance: Number(performance.toFixed(2)),
          quality: Number(quality.toFixed(2)),
          overall: Number(overall.toFixed(2)),
          timestamp: new Date(),
        },
      });
    }

    res.json({ success: true, data: products });
  } catch (error) {
    console.error("❌ Error in /oee route:", error);
    res.status(500).json({ success: false, message: "OEE calculation failed" });
  }
});

export default router;
