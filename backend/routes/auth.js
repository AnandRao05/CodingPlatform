  const express = require('express');
  const jwt = require('jsonwebtoken');
  const crypto = require('crypto');
  const User = require('../models/User');
  const { auth } = require('../middleware/auth');
  const { sendOtpEmail } = require('../utils/mailer');

  const router = express.Router();

  
  const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  };

  
  router.post('/signup', async (req, res) => {
    try {
      const { name, email, password, role, profile, classId } = req.body;

      
      if (role === 'admin') {
        return res.status(403).json({ message: 'Admin accounts cannot be created through signup' });
      }

      
      if (!['student', 'teacher'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Only student and teacher roles are allowed for signup.' });
      }

      
      if (role === 'student' && !classId) {
        return res.status(400).json({ message: 'Class ID is required for student signup' });
      }

      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      
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

      
      const token = generateToken(user._id);

      
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

  
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      
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

      
      let user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        
        user = await User.findOne({ originalEmail: normalizedEmail, role: 'teacher' });
        if (!user) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
      }

      
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      
      const token = generateToken(user._id);

      
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

  
  router.post('/request-otp', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required' });

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; 
      await user.save();

      await sendOtpEmail(email, otp, 'Login');

      res.json({ message: 'Secure OTP has been sent to your email.' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  
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

  
  router.get('/profile', auth, async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('-password');
      res.json({ user });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  
  router.put('/profile', auth, async (req, res) => {
    try {
      const { name, email, profile } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (email) {
        
        const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (existingUser) {
          return res.status(400).json({ message: 'Email is already in use' });
        }
        updateData.email = email;
        
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

  
  router.post('/request-password-change-otp', auth, async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; 
      await user.save();

      await sendOtpEmail(user.email, otp, 'Password Change');

      res.json({ message: 'A verification code has been sent to your email for security.' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  
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

      
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  
  router.put('/change-password', auth, async (req, res) => {
    try {
      const { currentPassword, newPassword, otp } = req.body;

      if (!currentPassword || !newPassword || !otp) {
        return res.status(400).json({ message: 'Current password, new password, and OTP are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      
      const user = await User.findOne({
        _id: req.user._id,
        otp,
        otpExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid or expired OTP code' });
      }

      
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      
      user.password = newPassword;
      user.otp = undefined; 
      user.otpExpires = undefined;
      await user.save();

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  
  router.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        
        return res.json({ message: 'If an account with this email exists, a password reset link has been sent.' });
      }

      
      const resetToken = crypto.randomBytes(20).toString('hex');
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; 
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; 

      await user.save();

      await sendOtpEmail(email, otp, 'Password Reset');

      res.json({ message: 'A secure reset link and OTP have been sent to your email.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  
  router.post('/reset-password/:token', async (req, res) => {
    try {
      const { password } = req.body;
      const resetToken = req.params.token;

      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }

      
      const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      
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

  
  router.post('/reset-password-otp', async (req, res) => {
    try {
      const { email, otp, password } = req.body;
      
      if (!email || !otp || !password) {
        return res.status(400).json({ message: 'Email, OTP and new password are required' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      
      const user = await User.findOne({ 
        email: normalizedEmail, 
        otp, 
        otpExpires: { $gt: Date.now() } 
      });

      if (!user) {
        
        const teacher = await User.findOne({
          originalEmail: normalizedEmail,
          role: 'teacher',
          otp,
          otpExpires: { $gt: Date.now() }
        });

        if (!teacher) {
          return res.status(401).json({ message: 'Invalid or expired verification code' });
        }
        
        
        var targetUser = teacher;
      } else {
        var targetUser = user;
      }

      
      targetUser.password = password;
      
      
      targetUser.otp = undefined;
      targetUser.otpExpires = undefined;
      targetUser.resetPasswordToken = undefined;
      targetUser.resetPasswordExpires = undefined;
      
      
      await targetUser.save();

      res.json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (error) {
      console.error('OTP Reset error:', error);
      res.status(500).json({ message: 'Unable to reset password. Please try again later.' });
    }
  });

  
  router.post('/logout', auth, async (req, res) => {
    try {
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  module.exports = router;