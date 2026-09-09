import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  designation: {
    type: String,
    trim: true,
    default: '',
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: '',
  },
  password: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    default: null,
  },
  otpExpires: {
    type: Date,
    default: null,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  approvedIps: [{
    ip: String,
    countryCode: String,
    countryName: String,
    approvedAt: Date,
  }],
}, { timestamps: true });

export default mongoose.model('User', userSchema);
