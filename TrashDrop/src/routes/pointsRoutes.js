const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware.authenticateUser);

// Get user points
router.get('/user', pointsController.getUserPoints);

// Award points
router.post('/award', pointsController.awardPoints);

// Get points history
router.get('/history', pointsController.getPointsHistory);

// Get available rewards
router.get('/rewards', pointsController.getAvailableRewards);

// Redeem a reward
router.post('/redeem', pointsController.redeemReward);

module.exports = router;
