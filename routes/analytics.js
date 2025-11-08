const express = require('express');
const router = express.Router();
const OEECalculator = require('../services/oeeCalculator');

// Get OEE for a specific product
router.get('/oee/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const oeeData = await OEECalculator.calculateOEE(sku);
    
    res.json({ 
      success: true, 
      data: oeeData 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get OEE for all products
router.get('/oee', async (req, res) => {
  try {
    const oeeData = await OEECalculator.calculateAllOEE();
    
    res.json({ 
      success: true, 
      data: oeeData 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get OEE history for a product
router.get('/oee-history/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const { hours = 24 } = req.query;
    
    const history = await OEECalculator.getOEEHistory(sku, parseInt(hours));
    
    res.json({ 
      success: true, 
      data: history 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;