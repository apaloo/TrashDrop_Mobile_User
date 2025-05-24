const express = require('express');
const router = express.Router();
const pickupController = require('../controllers/pickupController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all pickup routes
router.use(authMiddleware.authenticateUser);

// Create a new on-demand pickup request
router.post('/request', pickupController.createPickupRequest);

// Get all pickup requests for the current user
router.get('/requests', pickupController.getUserPickupRequests);

// Get a specific pickup request by ID
router.get('/request/:requestId', pickupController.getPickupRequestById);

// Update the status of a pickup request
router.put('/request/status', pickupController.updatePickupStatus);

// Schedule a recurring pickup
router.post('/schedule', pickupController.scheduleRecurringPickup);

// Get all scheduled pickups
router.get('/scheduled', pickupController.getScheduledPickups);

module.exports = router;
