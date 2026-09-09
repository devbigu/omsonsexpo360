import Exhibition from "../models/Exhibition.js";
import Card from "../models/Card.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createExhibition = async (req, res) => {
  try {
    const {
      name,
      startTime,
      endTime,
      timezone,
      country,
      locationType,
      venue,
      organizationDetails,
      organizerContactPerson,
      organizerEmail,
      organizerMobile,
      createdBy
    } = req.body;

    if (!name || !startTime || !endTime || !timezone || !country) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    const ex = await Exhibition.create({
      name,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      timezone,
      country,
      locationType: locationType || '',
      venue: venue || '',
      organizationDetails: organizationDetails || '',
      organizerContactPerson: organizerContactPerson || '',
      organizerEmail: organizerEmail || '',
      organizerMobile: organizerMobile || '',
      createdBy: createdBy || '',
    });
    return res.status(201).json({ success: true, data: ex });
  } catch (err) {
    console.error('Create exhibition error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

import User from "../models/User.js";
import Admin from "../models/Admin.js";

// ... existing code ...

const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

export const listExhibitions = async (req, res) => {
  const start = Date.now();
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query || {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // List of heavy fields to exclude in the overall list
    const excludedFields = "-perfInvoice -standDesign -samplesPackingList -insuranceFile -deposits -tickets -exhibitors";

    // 1. Check if the requester is an Admin
    const admin = await Admin.findById(userId).lean();
    if (admin) {
      // Admins see all exhibitions
      const total = await Exhibition.countDocuments();
      const items = await Exhibition.find()
        .select(excludedFields)
        .sort({ startTime: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const duration = Date.now() - start;
      console.log(`[API] GET /api/exhibitions - ${duration}ms (Admin)`);

      return res.json({
        success: true,
        data: items,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    }

    // 2. Check if the requester is a User
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // 3. Filter for Users (Case-insensitive matching)
    const emailRegex = new RegExp(`^${escapeRegex(user.email)}$`, 'i');
    const nameRegex = new RegExp(`^${escapeRegex(user.name)}$`, 'i');

    const filter = {
      $or: [
        { 'exhibitors.email': emailRegex },
        { 'exhibitorEmail': emailRegex }, // Legacy support
        { createdBy: nameRegex }
      ]
    };

    const total = await Exhibition.countDocuments(filter);
    const items = await Exhibition.find(filter)
      .select(excludedFields)
      .sort({ startTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const duration = Date.now() - start;
    console.log(`[API] GET /api/exhibitions - ${duration}ms (User)`);

    return res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('List exhibitions error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const duplicateExhibition = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await Exhibition.findById(id);
    if (!original) return res.status(404).json({ success: false, message: 'Exhibition not found' });
    const dup = await Exhibition.create({
      name: original.name + ' (copy)',
      startTime: original.startTime,
      endTime: original.endTime,
      timezone: original.timezone,
      country: original.country,
      locationType: original.locationType,
      venue: original.venue,
      organizationDetails: original.organizationDetails,
      organizerContactPerson: original.organizerContactPerson,
      organizerEmail: original.organizerEmail,
      organizerMobile: original.organizerMobile,
      createdBy: req.body.createdBy || original.createdBy || '',
      duplicatedFrom: original._id,
    });
    return res.status(201).json({ success: true, data: dup });
  } catch (err) {
    console.error('Duplicate exhibition error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getLiveExhibitions = async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user.id;
    const excludedFields = "-perfInvoice -standDesign -samplesPackingList -insuranceFile -deposits -tickets -exhibitors";

    // 1. Check if the requester is an Admin
    const admin = await Admin.findById(userId).lean();
    if (admin) {
      const items = await Exhibition.find({
        startTime: { $lte: now },
        endTime: { $gte: now },
      })
        .select(excludedFields)
        .sort({ createdAt: -1 })
        .lean();
      return res.json({ success: true, data: items });
    }

    // 2. Check if the requester is a User
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // 3. Filter for Users (Case-insensitive)
    const emailRegex = new RegExp(`^${escapeRegex(user.email)}$`, 'i');
    const nameRegex = new RegExp(`^${escapeRegex(user.name)}$`, 'i');

    const items = await Exhibition.find({
      startTime: { $lte: now },
      endTime: { $gte: now },
      $or: [
        { 'exhibitors.email': emailRegex },
        { 'exhibitorEmail': emailRegex },
        { createdBy: nameRegex }
      ]
    })
      .select(excludedFields)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('Get live exhibitions error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getExhibitionCards = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query || {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Card.countDocuments({ exhibitionId: id });
    const cards = await Card.find({ exhibitionId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return res.json({
      success: true,
      data: cards,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get exhibition cards error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteExhibition = async (req, res) => {
  try {
    const { id } = req.params;
    const ex = await Exhibition.findByIdAndDelete(id);
    if (!ex) return res.status(404).json({ success: false, message: 'Exhibition not found' });
    // Remove associated cards to avoid orphaned data
    await Card.deleteMany({ exhibitionId: id });
    return res.json({ success: true, message: 'Exhibition and its cards deleted' });
  } catch (err) {
    console.error('Delete exhibition error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getExhibitionChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const exhibition = await Exhibition.findById(id).lean();
    if (!exhibition) {
      return res.status(404).json({ success: false, message: 'Exhibition not found' });
    }
    return res.json({ success: true, data: exhibition });
  } catch (err) {
    console.error('Get exhibition checklist error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateExhibitionChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('=== UPDATE EXHIBITION CHECKLIST START ===');
    console.log('Exhibition ID:', id);

    const exhibition = await Exhibition.findById(id);
    if (!exhibition) {
      return res.status(404).json({ success: false, message: 'Exhibition not found' });
    }

    // Log all received body fields
    console.log('Received body fields:', Object.keys(req.body));
    console.log('Received files:', req.files ? Object.keys(req.files) : 'No files');

    const updateData = {};

    // Process all text fields from FormData
    const textFields = [
      'standNumber', 'standType', 'dimensions', 'portalLink', 'portalId', 'portalPasscode',
      'accommodationDetails', 'ticketsDetails',
      'contractorCompany', 'contractorPerson', 'contractorEmail', 'contractorMobile',
      'contractorQuote', 'contractorAdvance', 'contractorBalance',
      'samplesPallet', 'samplesWeight', 'samplesDimensions',
      'logisticsCompany', 'logisticsContact', 'logisticsEmail', 'logisticsMobile',
      'logisticsQuote', 'logisticsPayment', 'logisticsAwb', 'logisticsSamples',
      'remarks', 'totalPayment',
      // Legacy exhibitor fields (for backward compatibility)
      'exhibitorName', 'exhibitorDesignation', 'exhibitorEmail', 'exhibitorMobile'
    ];

    textFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field] || '';
        console.log(`Text field ${field}:`, req.body[field]);
      }
    });

    // Handle exhibitors array
    if (req.body.exhibitors) {
      try {
        let exhibitors = typeof req.body.exhibitors === 'string'
          ? JSON.parse(req.body.exhibitors)
          : req.body.exhibitors;
        if (Array.isArray(exhibitors) && exhibitors.length > 0) {
          // Temporarily hold exhibitors, we will map files later
          updateData.exhibitors = exhibitors;
          console.log('Exhibitors array (initial):', exhibitors);
        }
      } catch (e) {
        console.warn('Failed to parse exhibitors:', e.message);
      }
    }

    // Handle pallets array
    if (req.body.pallets) {
      try {
        const pallets = typeof req.body.pallets === 'string'
          ? JSON.parse(req.body.pallets)
          : req.body.pallets;
        if (Array.isArray(pallets)) {
          updateData.pallets = pallets;
          console.log('Pallets array:', pallets);
        }
      } catch (e) {
        console.warn('Failed to parse pallets:', e.message);
      }
    }

    // Process files if uploaded
    const allFiles = Object.values(req.files || {}).flat();
    console.log('Received files:', allFiles.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, mimetype: f.mimetype, size: f.size })));

    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    const processedFiles = allFiles.filter(f => allowedMimeTypes.includes(f.mimetype));
    const newPayslips = [];
    const newTicketFiles = [];
    const newExhibitorIdCards = [];

    if (allFiles.length !== processedFiles.length) {
      const invalidFiles = allFiles.filter(f => !allowedMimeTypes.includes(f.mimetype));
      console.warn('Skipping invalid files:', invalidFiles.map(f => ({ fieldname: f.fieldname, mimetype: f.mimetype })));
    }

    for (const file of processedFiles) {
      const fileUrl = `/uploads/${file.filename}`;

      // Map file field names to database fields
      if (file.fieldname === 'perfInvoice') {
        updateData.perfInvoice = fileUrl;
      } else if (file.fieldname === 'payslip') {
        newPayslips.push(fileUrl);
      } else if (file.fieldname === 'ticketFile') {
        newTicketFiles.push(fileUrl);
      } else if (file.fieldname === 'standDesign') {
        updateData.standDesign = fileUrl;
      } else if (file.fieldname === 'samplesPackingList') {
        updateData.samplesPackingList = fileUrl;
      } else if (file.fieldname === 'insuranceFile') {
        updateData.insuranceFile = fileUrl;
      } else if (file.fieldname === 'exhibitorIdCard') {
        newExhibitorIdCards.push(fileUrl);
      } else {
        console.warn('Unknown file field:', file.fieldname);
      }
      // Do NOT unlink - we want to keep the file now
    }

    // Keep existing PDFs if no new file was uploaded
    if (!updateData.perfInvoice && exhibition.perfInvoice) {
      updateData.perfInvoice = exhibition.perfInvoice;
    }
    // Handle structured deposits
    if (req.body.deposits) {
      try {
        let deposits = typeof req.body.deposits === 'string'
          ? JSON.parse(req.body.deposits)
          : req.body.deposits;

        if (Array.isArray(deposits)) {
          // Assign new payslips to entries missing them
          let fileIdx = 0;
          deposits = deposits.map(dep => {
            if (!dep.payslip && fileIdx < newPayslips.length) {
              return { ...dep, payslip: newPayslips[fileIdx++] };
            }
            return dep;
          });
          updateData.deposits = deposits;
        }
      } catch (e) {
        console.warn('Failed to parse deposits:', e.message);
        updateData.deposits = exhibition.deposits || [];
      }
    } else {
      updateData.deposits = exhibition.deposits || [];
    }

    // Handle structured tickets
    if (req.body.tickets) {
      try {
        let tickets = typeof req.body.tickets === 'string'
          ? JSON.parse(req.body.tickets)
          : req.body.tickets;

        if (Array.isArray(tickets)) {
          // Assign new ticket files to entries missing them
          let fileIdx = 0;
          tickets = tickets.map(t => {
            if (!t.file && fileIdx < newTicketFiles.length) {
              return { ...t, file: newTicketFiles[fileIdx++] };
            }
            return t;
          });
          updateData.tickets = tickets;
        }
      } catch (e) {
        console.warn('Failed to parse tickets:', e.message);
        updateData.tickets = exhibition.tickets || [];
      }
    } else {
      updateData.tickets = exhibition.tickets || [];
    }
    if (!updateData.standDesign && exhibition.standDesign) {
      updateData.standDesign = exhibition.standDesign;
    }
    if (!updateData.samplesPackingList && exhibition.samplesPackingList) {
      updateData.samplesPackingList = exhibition.samplesPackingList;
    }
    if (!updateData.insuranceFile && exhibition.insuranceFile) {
      updateData.insuranceFile = exhibition.insuranceFile;
    }

    // Handle exhibitors files mapping
    if (updateData.exhibitors) {
      let fileIdx = 0;
      updateData.exhibitors = updateData.exhibitors.map(ex => {
        if (!ex.idCard && fileIdx < newExhibitorIdCards.length) {
          return { ...ex, idCard: newExhibitorIdCards[fileIdx++] };
        }
        return ex;
      });
    }

    // Convert string booleans to actual booleans
    const booleanFields = [
      'paymentChecklist', 'badgeChecklist', 'accommodationChecklist',
      'posterChecklist', 'samplesDispatchChecklist', 'insuranceChecklist'
    ];
    booleanFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const value = req.body[field];
        updateData[field] = value === 'true' || value === true || value === '1';
        console.log(`Boolean field ${field}:`, req.body[field], '->', updateData[field]);
      } else {
        // Keep existing value if not provided
        updateData[field] = exhibition[field] || false;
        console.log(`Boolean field ${field} (existing):`, updateData[field]);
      }
    });

    console.log('Final updateData keys:', Object.keys(updateData));
    console.log('Update data preview:', JSON.stringify(updateData, null, 2).substring(0, 500) + '...');

    // Update exhibition
    const updated = await Exhibition.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('=== UPDATE EXHIBITION CHECKLIST SUCCESS ===');
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('=== UPDATE EXHIBITION CHECKLIST ERROR ===');
    console.error('Update exhibition checklist error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateExhibition = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      startTime,
      endTime,
      timezone,
      country,
      locationType,
      venue,
      organizationDetails,
      organizerContactPerson,
      organizerEmail,
      organizerMobile,
      createdBy
    } = req.body;

    const exhibition = await Exhibition.findById(id);
    if (!exhibition) {
      return res.status(404).json({ success: false, message: 'Exhibition not found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (timezone) updateData.timezone = timezone;
    if (country) updateData.country = country;
    if (locationType !== undefined) updateData.locationType = locationType;
    if (venue !== undefined) updateData.venue = venue;
    if (organizationDetails !== undefined) updateData.organizationDetails = organizationDetails;
    if (organizerContactPerson !== undefined) updateData.organizerContactPerson = organizerContactPerson;
    if (organizerEmail !== undefined) updateData.organizerEmail = organizerEmail;
    if (organizerMobile !== undefined) updateData.organizerMobile = organizerMobile;
    if (createdBy !== undefined) updateData.createdBy = createdBy;

    const updated = await Exhibition.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Update exhibition error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
