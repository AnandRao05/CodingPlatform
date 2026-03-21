  const express = require('express');
  const jwt = require('jsonwebtoken');
  const crypto = require('crypto');
  const User = require('../models/User');
  const { auth } = require('../middleware/auth');
  const { sendOtpEmail } = require('../utils/mailer');

  const router = express.Router();

  // Generate JWT token
  const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  };

  // Signup route - Only allow student and teacher signup
  router.post('/signup', async (req, res) => {
    try {
      const { name, email, password, role, profile, classId } = req.body;

      // Prevent admin signup through API
      if (role === 'admin') {
        return res.status(403).json({ message: 'Admin accounts cannot be created through signup' });
      }

      // Validate role
      if (!['student', 'teacher'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Only student and teacher roles are allowed for signup.' });
      }

      // Validate classId for students (required) and teachers (optional)
      if (role === 'student' && !classId) {
        return res.status(400).json({ message: 'Class ID is required for student signup' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      const user = new User({
        name,
        email: email.toLowerCase(),
        password,
        role,
        profile: profile || {},
        ...(role === 'student' && { classId }),
        ...(role === 'teacher' && classId && { classId }),
        ...(role === 'teacher' && { originalEmail: email })
      });

      await user.save();

      // Generate token
      const token = generateToken(user._id);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          classId: user.classId,
          profile: user.profile
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Login route
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email is required' });
      }
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ message: 'Password is required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Find user by email or original email (for teachers)
      let user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        // For teachers, also check originalEmail field
        user = await User.findOne({ originalEmail: normalizedEmail, role: 'teacher' });
        if (!user) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = generateToken(user._id);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          classId: user.classId,
          profile: user.profile
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Unable to sign in. Please try again later.' });
    }
  });

  // Request OTP for Login
  router.post('/request-otp', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required' });

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      await sendOtpEmail(email, otp, 'Login');

      res.json({ message: 'Secure OTP has been sent to your email.' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Login with OTP
  router.post('/login-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

      const user = await User.findOne({ 
        email: email.toLowerCase(), 
        otp, 
        otpExpires: { $gt: Date.now() } 
      });

      if (!user) return res.status(401).json({ message: 'Invalid or expired OTP' });

      user.otp = undefined;
      user.otpExpires = undefined;
      user.lastLogin = new Date();
      await user.save();

      const token = generateToken(user._id);
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          classId: user.classId
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get user profile
  router.get('/profile', auth, async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('-password');
      res.json({ user });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update user profile
  router.put('/profile', auth, async (req, res) => {
    try {
      const { name, email, profile } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (email) {
        // Check if email is already taken by another user
        const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (existingUser) {
          return res.status(400).json({ message: 'Email is already in use' });
        }
        updateData.email = email;
        // If teacher is updating email, keep original email for login access
        if (req.user.role === 'teacher') {
          updateData.originalEmail = req.user.originalEmail || req.user.email;
        }
      }
      if (profile) updateData.profile = { ...req.user.profile, ...profile };

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true }
      ).select('-password');

      res.json({ user });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Request OTP for Authenticated Password Change
  router.post('/request-password-change-otp', auth, async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      await sendOtpEmail(user.email, otp, 'Password Change');

      res.json({ message: 'A verification code has been sent to your email for security.' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Direct Password Update for Authenticated Users (No OTP required)
  router.put('/update-password-direct', auth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Change password (Requires OTP)
  router.put('/change-password', auth, async (req, res) => {
    try {
      const { currentPassword, newPassword, otp } = req.body;

      if (!currentPassword || !newPassword || !otp) {
        return res.status(400).json({ message: 'Current password, new password, and OTP are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      // Find user with password and check OTP
      const user = await User.findOne({
        _id: req.user._id,
        otp,
        otpExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid or expired OTP code' });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      user.otp = undefined; // Clear OTP after use
      user.otpExpires = undefined;
      await user.save();

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Forgot password
  router.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user exists
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If an account with this email exists, a password reset link has been sent.' });
      }

      // Create a reset token
      const resetToken = crypto.randomBytes(20).toString('hex');
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Hash and set reset token fields
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes (for OTP)

      await user.save();

      await sendOtpEmail(email, otp, 'Password Reset');

      res.json({ message: 'A secure reset link and OTP have been sent to your email.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Reset password
  router.post('/reset-password/:token', async (req, res) => {
    try {
      const { password } = req.body;
      const resetToken = req.params.token;

      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }

      // Hash token to compare with stored hash
      const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Update password (will be hashed by pre-save hook)
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      
      await user.save();

      res.json({ message: 'Password reset successfully. You can now login with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Reset password with OTP
  router.post('/reset-password-otp', async (req, res) => {
    try {
      const { email, otp, password } = req.body;
      if (!email || !otp || !password) {
        return res.status(400).json({ message: 'Email, OTP and new password are required' });
      }

      const user = await User.findOne({ 
        email: email.toLowerCase(), 
        otp, 
        otpExpires: { $gt: Date.now() } 
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid or expired OTP' });
      }

      // Update password
      user.password = password;
      user.otp = undefined;
      user.otpExpires = undefined;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      
      await user.save();

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('OTP Reset error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Logout (client-side token removal, but we can track it server-side if needed)
  router.post('/logout', auth, async (req, res) => {
    try {
      // Could implement token blacklisting here if needed
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  module.exports = router;