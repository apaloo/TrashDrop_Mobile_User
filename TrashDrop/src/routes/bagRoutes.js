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

module.exports = router;
