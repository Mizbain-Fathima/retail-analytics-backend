const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const AlertService = require('../services/alertService');

// Add stock to a product
router.post('/add-stock', async (req, res) => {
  try {
    const { sku, quantity, productData } = req.body;
    
    if (!sku || !quantity) {
      return res.status(400).json({ 
        error: 'SKU and quantity are required' 
      });
    }
    
    const result = await Inventory.addStock(sku, quantity, productData);
    res.json({ 
      success: true, 
      message: `Added ${quantity} units to ${sku}`,
      data: result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Remove stock (for sales or damages)
router.post('/remove-stock', async (req, res) => {
  try {
    const { sku, quantity, reason = 'SALE' } = req.body;
    
    if (!sku || !quantity) {
      return res.status(400).json({ 
        error: 'SKU and quantity are required' 
      });
    }
    
    const result = await Inventory.removeStock(sku, quantity, reason);
    res.json({ 
      success: true, 
      message: `Removed ${quantity} units from ${sku}`,
      data: result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Inventory.getAllProducts();
    res.json({ 
      success: true, 
      data: products 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get specific product
router.get('/product/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await Inventory.getProduct(sku);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const lowStock = await Inventory.getLowStock(parseInt(limit));
    
    res.json({ 
      success: true, 
      data: lowStock 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await AlertService.getAllAlerts();
    
    res.json({ 
      success: true, 
      data: alerts 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;