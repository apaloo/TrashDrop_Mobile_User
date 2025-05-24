/**
 * Location Routes
 * Handles all location-related API routes
 */

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticateUser } = require('../middleware/authMiddleware');

// All location routes require authentication
router.use(authenticateUser);

// Get all locations for the authenticated user
router.get('/user', locationController.getUserLocations);

// Get all disposal centers (public locations)
router.get('/disposal-centers', locationController.getDisposalCenters);

// Add a new location
router.post('/', locationController.addLocation);

// Update an existing location
router.put('/:id', locationController.updateLocation);

// Delete a location
router.delete('/:id', locationController.deleteLocation);

// Set a location as default
router.put('/:id/default', locationController.setDefaultLocation);

// Upload a location photo
router.post('/:id/photo', locationController.uploadLocationPhoto);

// Sync offline locations
router.post('/sync', locationController.syncLocations);

module.exports = router;
