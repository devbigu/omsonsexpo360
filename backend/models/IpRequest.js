import mongoose from 'mongoose';

const ipRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  countryCode: {
    type: String,
    default: null,
  },
  countryName: {
    type: String,
    default: null,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Optimization: Add indexes
ipRequestSchema.index({ userId: 1 });
ipRequestSchema.index({ createdAt: -1 });
ipRequestSchema.index({ approved: 1 });

export default mongoose.model('IpRequest', ipRequestSchema);

