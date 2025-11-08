require('dotenv').config();
const { createClient } = require('redis');

// Use the same Redis Cloud connection as your server
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 30000,
    lazyConnect: true
  }
});

const sampleProducts = [
  { sku: 'LAP-001', name: 'Gaming Laptop', max_capacity: 50, threshold: 5, shelf: 'A-1', zone: 'electronics', cost: 800, price: 1200 },
  { sku: 'PHN-001', name: 'Smartphone', max_capacity: 100, threshold: 15, shelf: 'A-2', zone: 'electronics', cost: 400, price: 699 },
  { sku: 'HD-001', name: 'Wireless Headphones', max_capacity: 75, threshold: 10, shelf: 'A-3', zone: 'electronics', cost: 50, price: 99 },
  { sku: 'TB-001', name: 'Tablet', max_capacity: 30, threshold: 3, shelf: 'A-4', zone: 'electronics', cost: 300, price: 499 },
  { sku: 'CH-001', name: 'USB-C Cable', max_capacity: 200, threshold: 25, shelf: 'B-1', zone: 'accessories', cost: 5, price: 19 },
];

class Inventory {
  static async addStock(sku, quantity, productData = {}) {
    try {
      const inventoryKey = `inventory:${sku}`;
      
      const exists = await redisClient.exists(inventoryKey);
      
      if (!exists) {
        await redisClient.hSet(inventoryKey, {
          sku: sku,
          name: productData.name || `Product ${sku}`,
          qty: 0,
          max_capacity: productData.max_capacity || 100,
          threshold: productData.threshold || 10,
          shelf: productData.shelf || 'A-1',
          zone: productData.zone || 'default',
          cost: productData.cost || 0,
          price: productData.price || 0,
          created_at: new Date().toISOString()
        });
      }
      
      const newQty = await redisClient.hIncrBy(inventoryKey, 'qty', parseInt(quantity));
      await redisClient.hSet(inventoryKey, 'last_updated', new Date().toISOString());
      
      // Update low stock sorted set
      await this.updateLowStockSet(sku, newQty);
      
      return { sku, newQuantity: newQty };
    } catch (error) {
      throw new Error(`Failed to add stock: ${error.message}`);
    }
  }

  static async updateLowStockSet(sku, currentQty) {
    try {
      const threshold = await redisClient.hGet(`inventory:${sku}`, 'threshold');
      if (threshold && currentQty <= threshold) {
        const priority = -currentQty;
        await redisClient.zAdd('lowstock:zset', { score: priority, value: sku });
      } else {
        await redisClient.zRem('lowstock:zset', sku);
      }
    } catch (error) {
      console.error('Error updating low stock set:', error);
    }
  }
}

async function seedData() {
  try {
    console.log('🌱 Seeding sample data to Redis Cloud...');
    console.log('Connecting to:', process.env.REDIS_URL?.replace(/:[^:]*@/, ':********@')); // Hide password in logs
    
    // Connect to Redis Cloud
    await redisClient.connect();
    console.log('✅ Connected to Redis Cloud');
    
    // Test connection
    await redisClient.ping();
    console.log('✅ Redis Cloud is responsive');
    
    // Clear existing data (optional)
    console.log('🧹 Clearing existing data...');
    const keys = await redisClient.keys('inventory:*');
    const lowStockKeys = await redisClient.keys('lowstock:*');
    const allKeys = [...keys, ...lowStockKeys];
    
    if (allKeys.length > 0) {
      await redisClient.del(allKeys);
      console.log(`✅ Cleared ${allKeys.length} existing keys`);
    }
    
    // Add sample products
    for (const product of sampleProducts) {
      const initialStock = Math.floor(
        Math.random() * (product.max_capacity - product.threshold) + product.threshold
      );
      
      await Inventory.addStock(product.sku, initialStock, product);
      console.log(`✅ Added ${product.name} with ${initialStock} units`);
      
      // Small delay to avoid overwhelming Redis Cloud
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify what was created
    const allProducts = await redisClient.keys('inventory:*');
    console.log(`📊 Total products in Redis Cloud: ${allProducts.length}`);
    
    // Show low stock items
    const lowStockCount = await redisClient.zCard('lowstock:zset');
    console.log(`⚠️  Low stock items: ${lowStockCount}`);
    
    console.log('🎉 Sample data seeded successfully to Redis Cloud!');
    
    await redisClient.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

seedData();