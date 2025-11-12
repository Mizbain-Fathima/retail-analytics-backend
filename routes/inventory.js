import express from "express";
const router = express.Router();
import Inventory from "../models/Inventory.js";
import AlertService from'../services/alertService.js';

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

// Add new product
router.post("/products", async (req, res) => {
  try {
    const { sku, name, qty, max_capacity, zone, shelf, cost, price } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ error: "SKU and name are required" });
    }

    const newProduct = {
      sku,
      name,
      qty,
      max_capacity,
      zone,
      shelf,
      cost,
      price
    };

    // Save to Redis (using SKU as key)
    await redisClient.hSet("products", sku, JSON.stringify(newProduct));

    res.status(201).json({ message: "Product added successfully", data: newProduct });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

export default router;