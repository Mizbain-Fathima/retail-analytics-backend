const redisClient = require('../config/redis');

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
      
      await this.updateLowStockSet(sku, newQty);
      await this.logEvent(sku, 'ADD_STOCK', quantity);
      
      return { sku, newQuantity: newQty };
    } catch (error) {
      throw new Error(`Failed to add stock: ${error.message}`);
    }
  }

  static async removeStock(sku, quantity, reason = 'SALE') {
    try {
      const inventoryKey = `inventory:${sku}`;
      const currentQty = await redisClient.hGet(inventoryKey, 'qty');
      
      if (!currentQty) {
        throw new Error(`Product ${sku} not found`);
      }
      
      if (parseInt(currentQty) < quantity) {
        throw new Error(`Insufficient stock. Available: ${currentQty}, Requested: ${quantity}`);
      }
      
      const newQty = await redisClient.hIncrBy(inventoryKey, 'qty', -parseInt(quantity));
      await redisClient.hSet(inventoryKey, 'last_updated', new Date().toISOString());
      
      await this.updateLowStockSet(sku, newQty);
      await this.logEvent(sku, `REMOVE_STOCK_${reason}`, quantity);
      
      if (reason === 'SALE') {
        await this.recordSale(sku, quantity);
      }
      
      return { sku, newQuantity: newQty };
    } catch (error) {
      throw new Error(`Failed to remove stock: ${error.message}`);
    }
  }

  static async getProduct(sku) {
    try {
      const inventory = await redisClient.hGetAll(`inventory:${sku}`);
      if (!inventory || !inventory.sku) {
        return null;
      }
      return inventory;
    } catch (error) {
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  static async getAllProducts() {
    try {
      const keys = await redisClient.keys('inventory:*');
      const products = [];
      
      for (const key of keys) {
        const product = await redisClient.hGetAll(key);
        if (product && product.sku) {
          products.push(product);
        }
      }
      
      return products;
    } catch (error) {
      throw new Error(`Failed to get all products: ${error.message}`);
    }
  }

  static async getLowStock(limit = 10) {
    try {
      const lowStockItems = await redisClient.zRange('lowstock:zset', 0, limit - 1);
      const products = [];
      
      for (const sku of lowStockItems) {
        const product = await this.getProduct(sku);
        if (product) {
          products.push(product);
        }
      }
      
      return products;
    } catch (error) {
      throw new Error(`Failed to get low stock items: ${error.message}`);
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

  static async logEvent(sku, action, quantity, metadata = {}) {
    try {
      const event = {
        sku,
        action,
        quantity: parseInt(quantity),
        timestamp: new Date().toISOString(),
        ...metadata
      };
      
      await redisClient.xAdd('inventory:events', '*', event);
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  static async recordSale(sku, quantity) {
    try {
      const hour = new Date().toISOString().slice(0, 13);
      const salesKey = `sales:${sku}:${hour}`;
      await redisClient.hIncrBy(salesKey, 'quantity', quantity);
      await redisClient.expire(salesKey, 86400);
    } catch (error) {
      console.error('Error recording sale:', error);
    }
  }
}

module.exports = Inventory;