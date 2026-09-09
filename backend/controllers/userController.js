import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import IpRequest from '../models/IpRequest.js';
import { generateOtp, isOtpValid } from '../utils/otp.js';
import { sendOtpEmail } from '../utils/email.js';
import { getClientIp, getIpGeolocation } from '../utils/ipGeolocation.js';

// @desc    Register a new user (OTP disabled - IP approval only)
// @route   POST /api/users/signup
// @access  Public
const signupUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: true,
    });

    // Generate token for new user
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({
      success: true,
      token,
      hasAccess: true,
      message: 'Account created successfully.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send OTP to user email
// @route   POST /api/users/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOtpEmail(email, otp);

    res.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    const statusCode = error.message.includes('not configured') ? 500 : 500;
    res.status(statusCode).json({
      message: error.message || 'Failed to send OTP',
      error: process.env.NODE_ENV !== 'production' ? error.code : undefined
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (!isOtpValid(user.otpExpires)) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({
      success: true,
      token,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user (OTP disabled - IP approval only)
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // 1. Check if user is an Admin
    const admin = await Admin.findOne({ email });

    if (admin && (await bcrypt.compare(password, admin.password))) {
      const token = jwt.sign({ id: admin._id, isAdmin: true }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      return res.json({
        success: true,
        token,
        role: 'admin',
        message: 'Admin login successful'
      });
    }

    // 2. If not admin, check for regular User
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // IP verification removed - directly generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    return res.json({
      success: true,
      token,
      hasAccess: true,
      role: 'user',
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check user access
// @route   GET /api/users/check-access
// @access  Private
const checkAccess = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ hasAccess: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ hasAccess: false });
    }

    res.json({
      hasAccess: true,
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ hasAccess: false });
  }
};

// @desc    Get current user info
// @route   GET /api/users/me
// @access  Private
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List all users (for dropdowns etc)
// @route   GET /api/users
// @access  Private
const listUsers = async (req, res) => {
  try {
    // Return id, name, email, designation, phoneNumber
    const users = await User.find().select('name email designation phoneNumber');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export { signupUser, sendOtp, verifyOtp, loginUser, checkAccess, getCurrentUser, listUsers };
