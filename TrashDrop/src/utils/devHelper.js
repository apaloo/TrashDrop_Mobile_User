/**
 * Development Helper Module
 * Contains utilities to help with development, such as in-memory OTP storage
 */

// In-memory OTP storage for development (this wouldn't be used in production)
const otpStore = new Map();

// Store an OTP code
exports.storeOTP = (phone, otp, name) => {
  otpStore.set(phone, {
    otp,
    name,
    expires: Date.now() + 10 * 60 * 1000 // 10 minutes
  });
  
  console.log('Development OTP Store:');
  console.log('--------------------------------------------------------');
  console.log(`Phone: ${phone}`);
  console.log(`Name: ${name}`);
  console.log(`OTP Code: ${otp}`);
  console.log(`Expires: ${new Date(Date.now() + 10 * 60 * 1000).toLocaleString()}`);
  console.log('--------------------------------------------------------');
  
  return true;
};

// Verify an OTP code
exports.verifyOTP = (phone, otp) => {
  const storedData = otpStore.get(phone);
  
  if (!storedData) {
    console.log(`No OTP found for ${phone}`);
    return { valid: false, error: 'No verification code found' };
  }
  
  if (storedData.expires < Date.now()) {
    console.log(`OTP expired for ${phone}`);
    return { valid: false, error: 'Verification code expired' };
  }
  
  if (storedData.otp !== otp) {
    console.log(`Invalid OTP for ${phone}. Expected ${storedData.otp}, got ${otp}`);
    return { valid: false, error: 'Invalid verification code' };
  }
  
  console.log(`OTP verified successfully for ${phone}`);
  return { 
    valid: true, 
    data: {
      name: storedData.name,
      phone
    }
  };
};

// Get all stored OTPs (for debugging)
exports.getAllOTPs = () => {
  const result = {};
  otpStore.forEach((value, key) => {
    result[key] = {
      ...value,
      expiresAt: new Date(value.expires).toLocaleString()
    };
  });
  return result;
};
