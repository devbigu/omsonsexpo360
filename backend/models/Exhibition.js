import mongoose from 'mongoose';

const exhibitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  timezone: { type: String, required: true },
  country: { type: String, required: true },
  locationType: { type: String, enum: ['DOMESTIC', 'INTERNATIONAL', ''], default: '' },
  venue: { type: String, default: '' },
  organizationDetails: { type: String, default: '' },
  organizerContactPerson: { type: String, default: '' },
  organizerEmail: { type: String, default: '' },
  organizerMobile: { type: String, default: '' },
  createdBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  duplicatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Exhibition', default: null },
  // Standard Checklist fields
  standNumber: { type: String, default: '' },
  standType: { type: String, default: '' },
  dimensions: { type: String, default: '' },
  perfInvoice: { type: String, default: '' }, // base64 PDF
  totalPayment: { type: Number, default: 0 },
  deposits: [{
    amount: { type: Number, default: 0 },
    payslip: { type: String, default: '' } // base64 PDF
  }],
  paymentChecklist: { type: Boolean, default: false },
  portalLink: { type: String, default: '' },
  portalId: { type: String, default: '' },
  portalPasscode: { type: String, default: '' },
  exhibitorName: { type: String, default: '' }, // Legacy field for backward compatibility
  exhibitorDesignation: { type: String, default: '' },
  exhibitorEmail: { type: String, default: '' },
  exhibitorMobile: { type: String, default: '' },
  exhibitors: [{
    name: { type: String, default: '' },
    designation: { type: String, default: '' },
    email: { type: String, default: '' },
    mobile: { type: String, default: '' },
    idCard: { type: String, default: '' }
  }],
  badgeChecklist: { type: Boolean, default: false },
  accommodationDetails: { type: String, default: '' },
  ticketsDetails: { type: String, default: '' },
  tickets: [{
    file: { type: String, default: '' } // base64 PDF or JPEG
  }],
  accommodationChecklist: { type: Boolean, default: false },
  contractorCompany: { type: String, default: '' },
  contractorPerson: { type: String, default: '' },
  contractorEmail: { type: String, default: '' },
  contractorMobile: { type: String, default: '' },
  contractorQuote: { type: String, default: '' },
  contractorAdvance: { type: String, default: '' },
  contractorBalance: { type: String, default: '' },
  standDesign: { type: String, default: '' }, // base64 PDF
  posterChecklist: { type: Boolean, default: false },
  samplesPallet: { type: String, default: '' },
  samplesWeight: { type: String, default: '' },
  samplesDimensions: { type: String, default: '' },
  samplesPackingList: { type: String, default: '' }, // base64 PDF
  samplesDispatchChecklist: { type: Boolean, default: false },
  pallets: [{
    name: { type: String, default: '' },
    weight: { type: String, default: '' },
    dimensions: { type: String, default: '' }
  }],
  logisticsCompany: { type: String, default: '' },
  logisticsContact: { type: String, default: '' },
  logisticsEmail: { type: String, default: '' },
  logisticsMobile: { type: String, default: '' },
  logisticsQuote: { type: String, default: '' },
  logisticsPayment: { type: String, default: '' },
  logisticsAwb: { type: String, default: '' },
  logisticsSamples: { type: String, default: '' },
  remarks: { type: String, default: '' },
  insuranceChecklist: { type: Boolean, default: false },
  insuranceFile: { type: String, default: '' } // file path or base64
});

// Optimization: Add indexes
exhibitionSchema.index({ startTime: -1 });
exhibitionSchema.index({ name: 1 });
exhibitionSchema.index({ country: 1 });
exhibitionSchema.index({ createdBy: 1 });
exhibitionSchema.index({ 'exhibitors.email': 1 });

export default mongoose.models.Exhibition || mongoose.model('Exhibition', exhibitionSchema);
