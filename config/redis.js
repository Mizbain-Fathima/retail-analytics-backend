// Backend/config/redis.js
import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("❌ Missing REDIS_URL in .env file");
}

// ✅ Use non-TLS (plain TCP) connection
const client = createClient({
  url: redisUrl,
  socket: {
    tls: false, // <— ensure TLS is OFF
    connectTimeout: 10000,
  },
});

client.on("connect", () => console.log("🔗 Connecting to Redis (non-TLS)..."));
client.on("ready", () => console.log("✅ Redis connected successfully"));
client.on("error", (err) => console.error("❌ Redis Client Error:", err.message));

export default client;