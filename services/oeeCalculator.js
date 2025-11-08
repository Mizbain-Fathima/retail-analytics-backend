const redisClient = require('../config/redis');
const Inventory = require('../models/Inventory');

class OEECalculator {
  static async calculateAvailability(sku) {
    try {
      const product = await Inventory.getProduct(sku);
      if (!product) throw new Error(`Product ${sku} not found`);
      
      const currentQty = parseInt(product.qty);
      const maxCapacity = parseInt(product.max_capacity);
      
      return (currentQty / maxCapacity) * 100;
    } catch (error) {
      console.error('Error calculating availability:', error);
      return 0;
    }
  }

  static async calculatePerformance(sku, period = 'hourly') {
    try {
      const product = await Inventory.getProduct(sku);
      if (!product) throw new Error(`Product ${sku} not found`);
      
      const hour = new Date().toISOString().slice(0, 13);
      const salesKey = `sales:${sku}:${hour}`;
      const actualSales = parseInt(await redisClient.hGet(salesKey, 'quantity') || 0);
      
      const expectedSales = 5;
      
      const performance = (actualSales / expectedSales) * 100;
      return Math.min(performance, 100);
    } catch (error) {
      console.error('Error calculating performance:', error);
      return 0;
    }
  }

  static async calculateQuality(sku) {
    try {
      const randomQuality = 80 + Math.random() * 20;
      return randomQuality;
    } catch (error) {
      console.error('Error calculating quality:', error);
      return 100;
    }
  }

  static async calculateOEE(sku) {
    try {
      const availability = await this.calculateAvailability(sku);
      const performance = await this.calculatePerformance(sku);
      const quality = await this.calculateQuality(sku);
      
      const overallOEE = (availability * performance * quality) / 10000;
      
      const oeeData = {
        sku,
        availability: Math.round(availability * 100) / 100,
        performance: Math.round(performance * 100) / 100,
        quality: Math.round(quality * 100) / 100,
        overall: Math.round(overallOEE * 100) / 100,
        timestamp: new Date().toISOString()
      };
      
      await redisClient.hSet(`oee:${sku}`, oeeData);
      await redisClient.expire(`oee:${sku}`, 86400);
      
      return oeeData;
    } catch (error) {
      console.error('Error calculating OEE:', error);
      throw error;
    }
  }

  static async calculateAllOEE() {
    try {
      const products = await Inventory.getAllProducts();
      const results = [];
      
      for (const product of products) {
        const oeeData = await this.calculateOEE(product.sku);
        results.push({
          ...product,
          oee: oeeData
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error calculating all OEE:', error);
      throw error;
    }
  }

  static async getOEEHistory(sku, hours = 24) {
    try {
      const history = [];
      const now = new Date();
      
      for (let i = hours - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        history.push({
          timestamp: timestamp.toISOString(),
          availability: 70 + Math.random() * 25,
          performance: 60 + Math.random() * 35,
          quality: 80 + Math.random() * 20,
          overall: 50 + Math.random() * 45
        });
      }
      
      return history;
    } catch (error) {
      console.error('Error getting OEE history:', error);
      throw error;
    }
  }
}

module.exports = OEECalculator;