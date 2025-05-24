const express = require('express');
const router = express.Router();
const { authenticateUser, checkRole } = require('../middleware/authMiddleware');

// GET user profile - protected endpoint
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    // The user object is attached by the middleware
    const userId = req.user.sub || req.user.id;
    
    // In a real application, you would fetch the profile from your database
    // Here we'll just return the user information from the token
    res.json({
      id: userId,
      phone: req.user.phone,
      email: req.user.email,
      role: req.user.role || 'user',
      message: 'Profile fetched successfully with JWT authentication'
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET user settings - protected endpoint with role check
router.get('/settings', authenticateUser, checkRole(['admin', 'user']), (req, res) => {
  res.json({
    theme: 'light',
    notifications: true,
    language: 'en',
    message: 'Settings fetched successfully with JWT authentication and role verification'
  });
});

module.exports = router;
