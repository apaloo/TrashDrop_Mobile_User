const express = require('express');
const router = express.Router();
const bagController = require('../controllers/bagController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all bag routes
router.use(authMiddleware.authenticateUser);

// Register a new scanned bag
router.post('/register', bagController.registerBag);

// Get all bags for a specific pickup request
router.get('/request/:requestId', bagController.getBagsByRequest);

// Get all bags for the authenticated user
router.get('/user', bagController.getUserBags);

// Verify a bag by ID
router.get('/verify/:bagId', bagController.verifyBag);

// Order new bags for delivery
router.post('/order', bagController.orderBags);

// Get bag orders for the authenticated user
router.get('/orders', bagController.getUserOrders);

// Get order details by tracking ID
router.get('/order/:trackingId', bagController.getOrderByTracking);

// Get the user's available bag count
router.get('/count', bagController.getBagCount);

module.exports = router;
