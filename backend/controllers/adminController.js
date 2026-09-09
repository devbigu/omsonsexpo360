import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import IpRequest from '../models/IpRequest.js';
import User from '../models/User.js';

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });

    if (admin && (await bcrypt.compare(password, admin.password))) {
      const token = jwt.sign({ id: admin._id, isAdmin: true }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      res.json({
        success: true,
        token,
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current admin profile
// @route   GET /api/admin/me
// @access  Private (Admin)
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (admin) {
      res.json({
        success: true,
        data: admin,
      });
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update current admin profile
// @route   PUT /api/admin/me
// @access  Private (Admin)
const updateAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    if (admin) {
      admin.name = req.body.name || admin.name;
      admin.email = req.body.email || admin.email;

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedAdmin = await admin.save();

      res.json({
        success: true,
        data: {
          _id: updatedAdmin._id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
        },
      });
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all IP requests
// @route   GET /api/admin/ip-requests
// @access  Private (Admin)
const getIpRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query || {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await IpRequest.countDocuments();
    const requests = await IpRequest.find()
      .sort({ createdAt: -1 })
      .populate('approvedBy', 'email')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: requests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get IP requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve or reject IP request
// @route   PUT /api/admin/ip-requests/:id
// @access  Private (Admin)
const approveIpRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    const adminId = req.admin?.id;

    const request = await IpRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: 'IP request not found' });
    }

    request.approved = approved;
    request.approvedBy = adminId;
    request.approvedAt = new Date();
    await request.save();

    if (approved) {
      // Add IP to user's approved IPs
      const user = await User.findById(request.userId);
      if (user) {
        const ipExists = user.approvedIps.some(ip => ip.ip === request.ipAddress);
        if (!ipExists) {
          user.approvedIps.push({
            ip: request.ipAddress,
            countryCode: request.countryCode,
            countryName: request.countryName,
            approvedAt: new Date(),
          });
          await user.save();
        }
      }
    }

    res.json({
      success: true,
      message: `IP request ${approved ? 'approved' : 'rejected'}`,
      data: request,
    });
  } catch (error) {
    console.error('Approve IP request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

import Exhibition from '../models/Exhibition.js';
import Card from '../models/Card.js';

// ... (existing imports)

// Helper to escape CSV fields
const escapeCsv = (field) => {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

// @desc    Export all exhibitions to CSV
// @route   GET /api/admin/export/exhibitions
// @access  Private (Admin)
const exportExhibitions = async (req, res) => {
  try {
    const exhibitions = await Exhibition.find().sort({ startTime: -1 });

    const headers = [
      'Name',
      'Start Time',
      'End Time',
      'Timezone',
      'Country',
      'Stand Number',
      'Stand Type',
      'Dimensions',
      'Portal Link',
      'Portal ID',
      'Portal Passcode',
      'Exhibitor Name',
      'Exhibitor Email',
      'Exhibitor Mobile',
      'Accommodation Details',
      'Tickets Details',
      'Contractor Company',
      'Contractor Person',
      'Contractor Email',
      'Contractor Mobile',
      'Contractor Quote',
      'Contractor Advance',
      'Contractor Balance',
      'Logistics Company',
      'Logistics Contact',
      'Logistics Email',
      'Logistics Mobile',
      'Logistics Quote',
      'Logistics Payment',
      'Logistics AWB',
      'Logistics Samples',
      'Created By',
      'Created At'
    ];

    let csv = headers.join(',') + '\n';

    exhibitions.forEach(ex => {
      // Handle exhibitors array - take the first one or fall back to legacy fields
      let mainExhibitor = {};
      if (ex.exhibitors && ex.exhibitors.length > 0) {
        mainExhibitor = ex.exhibitors[0];
      } else {
        mainExhibitor = {
          name: ex.exhibitorName,
          email: ex.exhibitorEmail,
          mobile: ex.exhibitorMobile
        };
      }

      const row = [
        escapeCsv(ex.name),
        escapeCsv(ex.startTime ? new Date(ex.startTime).toLocaleDateString() : ''),
        escapeCsv(ex.endTime ? new Date(ex.endTime).toLocaleDateString() : ''),
        escapeCsv(ex.timezone),
        escapeCsv(ex.country),
        escapeCsv(ex.standNumber),
        escapeCsv(ex.standType),
        escapeCsv(ex.dimensions),
        escapeCsv(ex.portalLink),
        escapeCsv(ex.portalId),
        escapeCsv(ex.portalPasscode),
        escapeCsv(mainExhibitor.name),
        escapeCsv(mainExhibitor.email),
        escapeCsv(mainExhibitor.mobile),
        escapeCsv(ex.accommodationDetails),
        escapeCsv(ex.ticketsDetails),
        escapeCsv(ex.contractorCompany),
        escapeCsv(ex.contractorPerson),
        escapeCsv(ex.contractorEmail),
        escapeCsv(ex.contractorMobile),
        escapeCsv(ex.contractorQuote),
        escapeCsv(ex.contractorAdvance),
        escapeCsv(ex.contractorBalance),
        escapeCsv(ex.logisticsCompany),
        escapeCsv(ex.logisticsContact),
        escapeCsv(ex.logisticsEmail),
        escapeCsv(ex.logisticsMobile),
        escapeCsv(ex.logisticsQuote),
        escapeCsv(ex.logisticsPayment),
        escapeCsv(ex.logisticsAwb),
        escapeCsv(ex.logisticsSamples),
        escapeCsv(ex.createdBy),
        escapeCsv(ex.createdAt ? new Date(ex.createdAt).toLocaleString() : '')
      ];
      csv += row.join(',') + '\n';
    });

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="exhibitions.csv"');
    res.send(csv);

  } catch (error) {
    console.error('Export exhibitions error:', error);
    res.status(500).json({ message: 'Server error exporting exhibitions' });
  }
};

// @desc    Export cards for an exhibition to CSV
// @route   GET /api/admin/export/exhibitions/:id/cards
// @access  Private (Admin)
const exportExhibitionCards = async (req, res) => {
  try {
    const { id } = req.params;
    const exhibition = await Exhibition.findById(id);

    if (!exhibition) {
      return res.status(404).json({ message: 'Exhibition not found' });
    }

    const cards = await Card.find({ exhibitionId: id }).sort({ createdAt: -1 });

    const headers = [
      'Company Name',
      'Contact Person',
      'Designation',
      'Mobile',
      'Email',
      'Address',
      'Website',
      'Type Of Visitor',
      'Interested Products',
      'Remarks',
      'Scanned At'
    ];

    let csv = headers.join(',') + '\n';

    cards.forEach(card => {
      const row = [
        escapeCsv(card.companyName),
        escapeCsv(card.contactPerson),
        escapeCsv(card.designation),
        escapeCsv(card.mobile),
        escapeCsv(card.email),
        escapeCsv(card.address),
        escapeCsv(card.website),
        escapeCsv(card.typeOfVisitor),
        escapeCsv(card.interestedProducts ? card.interestedProducts.join('; ') : ''),
        escapeCsv(card.remarks),
        escapeCsv(card.createdAt ? new Date(card.createdAt).toLocaleString() : '')
      ];
      csv += row.join(',') + '\n';
    });

    const filename = `cards-${exhibition.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

  } catch (error) {
    console.error('Export cards error:', error);
    res.status(500).json({ message: 'Server error exporting cards' });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query || {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await User.countDocuments();
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new user (Admin)
// @route   POST /api/admin/users
// @access  Private (Admin)
const createUser = async (req, res) => {
  try {
    const { name, email, password, designation, phoneNumber } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      designation: designation || '',
      phoneNumber: phoneNumber || '',
      password: hashedPassword,
      isEmailVerified: true, // Auto-verify if admin creates
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          designation: user.designation,
          phoneNumber: user.phoneNumber,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user (Admin)
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, designation, phoneNumber } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    if (designation !== undefined) user.designation = designation;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        designation: updatedUser.designation,
        phoneNumber: updatedUser.phoneNumber,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User removed',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all admins (Super Admin)
// @route   GET /api/admin/admins
// @access  Private (Admin)
const getAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query || {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Admin.countDocuments();
    const admins = await Admin.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: admins,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new admin (Super Admin)
// @route   POST /api/admin/admins
// @access  Private (Admin)
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, designation, phoneNumber } = req.body;

    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      designation: designation || '',
      phoneNumber: phoneNumber || '',
    });

    if (admin) {
      res.status(201).json({
        success: true,
        data: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          designation: admin.designation,
          phoneNumber: admin.phoneNumber,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid admin data' });
    }
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update admin (Super Admin)
// @route   PUT /api/admin/admins/:id
// @access  Private (Admin)
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, designation, phoneNumber } = req.body;

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.name = name || admin.name;
    admin.email = email || admin.email;
    admin.designation = designation !== undefined ? designation : admin.designation;
    admin.phoneNumber = phoneNumber !== undefined ? phoneNumber : admin.phoneNumber;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    const updatedAdmin = await admin.save();

    res.json({
      success: true,
      data: {
        _id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        designation: updatedAdmin.designation,
        phoneNumber: updatedAdmin.phoneNumber,
      },
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete admin (Super Admin)
// @route   DELETE /api/admin/admins/:id
// @access  Private (Admin)
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Prevent deleting the super admin
    if (admin.email === 'superadmin@bizcard.com') {
      return res.status(400).json({ message: 'Cannot delete super admin' });
    }

    await admin.deleteOne();

    res.json({
      success: true,
      message: 'Admin removed',
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  getIpRequests,
  approveIpRequest,
  exportExhibitions,
  exportExhibitionCards,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin
};

