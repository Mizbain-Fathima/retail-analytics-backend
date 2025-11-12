import redisClient from'../config/redis.js';

class AlertService {
  static async checkLowStockAlerts() {
    try {
      const lowStockProducts = await redisClient.zRange('lowstock:zset', 0, 10);
      const alerts = [];
      
      for (const sku of lowStockProducts) {
        const product = await redisClient.hGetAll(`inventory:${sku}`);
        if (product && product.qty) {
          alerts.push({
            type: 'LOW_STOCK',
            sku: product.sku,
            productName: product.name,
            currentQty: parseInt(product.qty),
            threshold: parseInt(product.threshold),
            severity: this.getStockSeverity(product.qty, product.threshold),
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('Error checking low stock alerts:', error);
      return [];
    }
  }

  static async checkOEEAlerts() {
    try {
      const inventoryKeys = await redisClient.keys('inventory:*');
      const alerts = [];
      
      for (const key of inventoryKeys) {
        const sku = key.replace('inventory:', '');
        const oeeData = await redisClient.hGetAll(`oee:${sku}`);
        
        if (oeeData && oeeData.overall) {
          const overallOEE = parseFloat(oeeData.overall);
          
          if (overallOEE < 50) {
            const product = await redisClient.hGetAll(key);
            alerts.push({
              type: 'LOW_OEE',
              sku: sku,
              productName: product.name,
              oee: overallOEE,
              severity: 'CRITICAL',
              timestamp: new Date().toISOString(),
              message: `OEE critically low: ${overallOEE}%`
            });
          } else if (overallOEE < 70) {
            const product = await redisClient.hGetAll(key);
            alerts.push({
              type: 'LOW_OEE',
              sku: sku,
              productName: product.name,
              oee: overallOEE,
              severity: 'WARNING',
              timestamp: new Date().toISOString(),
              message: `OEE below target: ${overallOEE}%`
            });
          }
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('Error checking OEE alerts:', error);
      return [];
    }
  }

  static getStockSeverity(currentQty, threshold) {
    const ratio = currentQty / threshold;
    
    if (ratio <= 0.5) return 'CRITICAL';
    if (ratio <= 0.8) return 'HIGH';
    if (ratio <= 1.0) return 'MEDIUM';
    return 'LOW';
  }

  static async getAllAlerts() {
    try {
      const stockAlerts = await this.checkLowStockAlerts();
      const oeeAlerts = await this.checkOEEAlerts();
      
      return [...stockAlerts, ...oeeAlerts].sort((a, b) => 
        a.timestamp > b.timestamp ? -1 : 1
      );
    } catch (error) {
      console.error('Error getting all alerts:', error);
      return [];
    }
  }
}

export default AlertService;