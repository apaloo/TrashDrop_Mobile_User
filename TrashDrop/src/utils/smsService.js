const axios = require('axios');
const configManager = require('../config/config-manager');

// Environment check
const isDevelopment = configManager.get('environment') !== 'production';

// SMS Provider configuration (only used in production)
const SMS_API_URL = configManager.get('services.sms.apiUrl') || 'https://api.yoursmsservice.com/send';
const SMS_API_KEY = configManager.get('services.sms.apiKey');

exports.sendOTP = async (phoneNumber, otp) => {
  // In development mode, just log the OTP and return success
  if (isDevelopment) {
    console.log('=========================================');
    console.log(`📱 DEVELOPMENT MODE: SMS would be sent to ${phoneNumber}`);
    console.log(`🔑 OTP CODE: ${otp}`);
    console.log('Use this code for verification in development');
    console.log('=========================================');
    
    return { success: true, development: true };
  }
  
  // In production, use the actual SMS service
  try {
    const response = await axios.post(
      SMS_API_URL,
      {
        to: phoneNumber,
        message: `Your TrashDrop verification code is: ${otp}. Valid for 10 minutes.`
      },
      {
        headers: {
          'Authorization': `Bearer ${SMS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('SMS Service Error:', error);
    throw new Error('Failed to send SMS');
  }
};
