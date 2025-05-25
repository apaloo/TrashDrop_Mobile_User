const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// User signup route
router.post('/signup', authController.signup);

// OTP verification route
router.post('/verify-otp', authController.verifyOTP);

// User login route
router.post('/login', authController.login);

// Password reset request route
router.post('/reset-password-request', authController.requestPasswordReset);

// Password reset with OTP route
router.post('/reset-password', authController.resetPassword);

// Logout route
router.post('/logout', authController.logout);

// Get Supabase configuration for client
router.get('/config', authController.getConfig);

module.exports = router;
