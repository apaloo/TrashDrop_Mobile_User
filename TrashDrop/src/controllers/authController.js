const { supabase, jwtHelpers } = require('../config/supabase');
const smsService = require('../utils/smsService');
const devHelper = require('../utils/devHelper');

// Environment check
const isDevelopment = process.env.NODE_ENV !== 'production';

// Sign up with phone number
exports.signup = async (req, res) => {
  try {
    console.log('Signup request received:', req.body);
    const { name, phone } = req.body;
    
    if (!name || !phone) {
      console.error('Signup error: Missing required fields');
      return res.status(400).json({ error: 'Name and phone number are required' });
    }
    
    console.log(`Processing signup for ${name} with phone ${phone}`);
    
    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('profiles')
      .select('phone')
      .eq('phone', phone)
      .single();
      
    if (userCheckError) {
      console.log('User check error (expected during development):', userCheckError.message);
    }
      
    if (existingUser) {
      console.log('Phone number already registered:', phone);
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated OTP code: ${otp} for user ${name}`);
    
    // Store OTP - use in-memory store in development
    if (isDevelopment) {
      devHelper.storeOTP(phone, otp, name);
      console.log('OTP stored in development helper');
    } else {
      // Store OTP in session for production
      req.session.signupOTP = {
        phone,
        name,
        otp,
        expires: Date.now() + 10 * 60 * 1000 // 10 minutes
      };
      console.log('OTP stored in session with expiry:', new Date(req.session.signupOTP.expires));
    }
    
    // Send OTP via SMS
    const smsResult = await smsService.sendOTP(phone, otp);
    console.log('SMS service result:', smsResult);
    
    console.log('Signup process completed successfully');
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// Verify OTP and create user
exports.verifyOTP = async (req, res) => {
  try {
    console.log('OTP verification request received:', req.body);
    const { otp, password, phone } = req.body;
    
    if (!otp || !password) {
      console.error('Verification error: Missing required fields');
      return res.status(400).json({ error: 'OTP and password are required' });
    }
    
    let isValid = false;
    let userData = {};
    
    // Verify OTP differently based on environment
    if (isDevelopment) {
      console.log('Using development helper for OTP verification');
      const verificationResult = devHelper.verifyOTP(phone, otp);
      console.log('Verification result:', verificationResult);
      
      if (!verificationResult.valid) {
        console.error('Verification error:', verificationResult.error);
        return res.status(400).json({ error: verificationResult.error });
      }
      
      isValid = true;
      userData = verificationResult.data;
      console.log('Development OTP verification successful:', userData);
    } else {
      // Production verification using session
      const storedOTP = req.session.signupOTP;
      console.log('Session data:', req.session);
      console.log('Stored OTP data:', storedOTP);
      
      if (!storedOTP) {
        console.error('Verification error: No OTP found in session');
        return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
      }
      
      if (storedOTP.expires < Date.now()) {
        console.error('Verification error: OTP expired');
        return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
      }
      
      console.log(`Comparing OTP: received=${otp}, stored=${storedOTP.otp}`);
      if (otp !== storedOTP.otp) {
        console.error('Verification error: Invalid OTP');
        return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
      }
      
      isValid = true;
      userData = {
        name: storedOTP.name,
        phone: storedOTP.phone
      };
    }
    
    console.log('OTP verification successful');
    
    // Create user in Supabase Auth
    let authUser = { user: { id: 'dev-user-id' } }; // Default mock user for development
    let authError = null;
    
    try {
      const response = await supabase.auth.signUp({
        phone: userData.phone,
        password: password
      });
      
      if (response && response.data) {
        authUser = response.data;
      }
      
      if (response && response.error) {
        authError = response.error;
      }
    } catch (error) {
      console.log('Supabase auth error (expected in development):', error.message);
      // In development, we'll continue with the mock user
      if (!isDevelopment) {
        authError = error;
      }
    }
    
    if (authError && !isDevelopment) {
      return res.status(400).json({ error: authError.message });
    }
    
    console.log('Auth user:', isDevelopment ? 'Using mock user ID in development' : authUser);
    
    // Parse full name into first name and last name
    const nameParts = userData.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    // Create user profile in profiles table
    let profileError = null;
    
    try {
      const profileData = {
        id: authUser.user.id,
        first_name: firstName,
        last_name: lastName,
        phone: userData.phone,
        email: '',
        address: '',
        dark_mode: false,
        phone_verified: true
      };
      
      console.log('Creating user profile with data:', isDevelopment ? 'Development profile data' : profileData);
      
      if (!isDevelopment) {
        // In production, actually create the profile
        const response = await supabase
          .from('profiles')
          .insert(profileData);
          
        if (response && response.error) {
          profileError = response.error;
        }
      } else {
        // In development, just log that we would create a profile
        console.log('Development mode: Would create profile for user', firstName, lastName);
      }
    } catch (error) {
      console.log('Profile creation error (expected in development):', error.message);
      // In development, we'll ignore this error
      if (!isDevelopment) {
        profileError = error;
      }
    }
    
    if (profileError && !isDevelopment) {
      return res.status(400).json({ error: profileError.message });
    }
    
    // Clear OTP based on environment
    if (isDevelopment) {
      // In development, we don't need to clear anything from the devHelper
      // as it will expire naturally
      console.log('Development mode: OTP verification completed successfully');
    } else {
      // In production, clear from session
      delete req.session.signupOTP;
      console.log('Production mode: Cleared OTP from session');
    }
    
    // Generate JWT token for the new user
    const jwtToken = jwtHelpers.generateToken({
      id: authUser.user.id,
      phone: userData.phone,
      role: 'user',
      name: userData.name
    });
    
    console.log('Generated JWT token for new user');
    
    res.status(201).json({
      message: 'User created successfully',
      token: jwtToken
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// Login with phone and password
exports.login = async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      console.error('Login error: Missing required fields');
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    console.log(`Processing login for phone ${phone}`);
    
    if (isDevelopment) {
      console.log('Development mode: Simulating successful login');
      
      // In development, create a mock user and token
      const mockUserId = 'dev-user-' + Date.now();
      const mockUser = {
        id: mockUserId,
        phone: phone,
        role: 'user',
        email: 'dev@example.com',
        created_at: new Date().toISOString()
      };
      
      // Generate a real JWT token even in development mode
      const jwtToken = jwtHelpers.generateToken({
        id: mockUserId,
        phone: phone,
        role: 'user'
      });
      
      console.log('Generated JWT token for development login');
      
      return res.status(200).json({
        success: true,
        user: mockUser,
        token: jwtToken,
        message: 'Login successful (development mode)'
      });
    }
    
    // In production, use Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      phone,
      password
    });
    
    if (error) {
      console.error('Login error:', error.message);
      return res.status(401).json({ error: error.message });
    }
    
    console.log('Login successful for user:', data.user.id);
    
    // Get user profile to add role information
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    // Merge profile data with user data
    const userData = {
      ...data.user,
      ...(profileData || {})
    };
    
    // Generate JWT token
    const jwtToken = jwtHelpers.generateToken({
      id: data.user.id,
      phone: userData.phone,
      email: userData.email,
      role: profileData?.role || 'user'
    });
    
    console.log('Generated JWT token for authenticated user');
    
    res.status(200).json({ 
      user: userData,
      token: jwtToken,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in session
    req.session.resetOTP = {
      phone,
      otp,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    
    // Send OTP via SMS
    await smsService.sendOTP(phone, otp);
    
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to request password reset' });
  }
};

// Reset password with OTP
exports.resetPassword = async (req, res) => {
  try {
    const { otp, phone, newPassword } = req.body;
    
    // Get OTP from session
    const storedOTP = req.session.resetOTP;
    
    if (!storedOTP || storedOTP.expires < Date.now()) {
      return res.status(400).json({ error: 'OTP expired' });
    }
    
    if (otp !== storedOTP.otp || phone !== storedOTP.phone) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    // Find user by phone number
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();
      
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }
    
    // Clear OTP from session
    delete req.session.resetOTP;
    
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    console.log('Logout request received');
    
    if (isDevelopment) {
      console.log('Development mode: Simulating successful logout');
      return res.status(200).json({ message: 'Logged out successfully' });
    }
    
    // In production, use Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Logout successful');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};
