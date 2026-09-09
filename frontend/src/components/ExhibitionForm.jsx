import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiSave, FiEdit2, FiPlus, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { getExhibitionChecklist, updateExhibitionChecklist, getAllUsers } from '../services/api.js';
import { compressFile, getSizeReductionInfo } from '../utils/fileCompression.js';

const STAND_FIELDS = [
  { name: 'standNumber', label: 'Stand Number', placeholder: 'e.g. A-12' },
  { name: 'standType', label: 'Type of Stand', placeholder: 'RAW SPACE / SHELL SPACE' },
  { name: 'dimensions', label: 'Dimensions (SQM) L x W', placeholder: 'e.g. 36 sqm (6m x 6m)' },
];

const CHECKLISTS = [
  { name: 'paymentChecklist', label: 'Payment Installments Checklist' },
  { name: 'badgeChecklist', label: 'Badges Submitted' },
  { name: 'posterChecklist', label: 'Exhibition Posters Ready' },
  { name: 'samplesDispatchChecklist', label: 'Samples Dispatch Confirmed' },
];

const EXHIBITOR_FIELDS = [
  { name: 'exhibitorName', label: 'Company Exhibitor – Name', placeholder: 'Primary attendee' },
  { name: 'exhibitorDesignation', label: 'Designation', placeholder: 'e.g. Technical Consultant' },
  { name: 'exhibitorEmail', label: 'Email ID', placeholder: 'name@company.com' },
  { name: 'exhibitorMobile', label: 'Mobile Number', placeholder: '+44 (0) 7444 045 025' },
];

const CONTRACTOR_FIELDS = [
  { name: 'contractorCompany', label: 'Stand Contractor – Company', placeholder: 'Design House Ltd.' },
  { name: 'contractorPerson', label: 'Contact Person', placeholder: 'Project Manager' },
  { name: 'contractorEmail', label: 'Email', placeholder: 'contact@design.com' },
  { name: 'contractorMobile', label: 'Mobile', placeholder: '+1 555 222 3333' },
  { name: 'contractorQuote', label: 'Final Quote', placeholder: 'USD 25,000' },
  { name: 'contractorAdvance', label: 'Advance Payment', placeholder: 'USD 10,000' },
  { name: 'contractorBalance', label: 'Balance Payment', placeholder: 'USD 15,000' },
];

const LOGISTICS_FIELDS = [
  { name: 'logisticsCompany', label: 'Logistics Company', placeholder: 'Transit Co.' },
  { name: 'logisticsContact', label: 'Contact Person', placeholder: 'Logistics Manager' },
  { name: 'logisticsEmail', label: 'Email ID', placeholder: 'logistics@example.com' },
  { name: 'logisticsMobile', label: 'Mobile', placeholder: '+971 4 123 4567' },
  { name: 'logisticsQuote', label: 'Final Quote', placeholder: 'USD 8,000' },
  { name: 'logisticsPayment', label: 'Payment Status', placeholder: 'Advance Paid / Due' },
  { name: 'logisticsAwb', label: 'Tracking Number', placeholder: 'AWB123456789' },
  { name: 'logisticsSamples', label: 'Samples Status', placeholder: 'In Transit / Delivered' },
];

export default function ExhibitionForm() {
  const { id } = useParams();

  const initialState = {
    standNumber: '',
    standType: '',
    dimensions: '',
    perfInvoice: null,
    totalPayment: 0,
    deposits: [],
    portalLink: '',
    portalId: '',
    portalPasscode: '',
    exhibitors: [{ name: '', designation: '', email: '', mobile: '', idCard: null }],
    badgeChecklist: false,
    accommodationDetails: '',
    ticketsDetails: '',
    tickets: [],
    accommodationChecklist: false,
    contractorCompany: '',
    contractorPerson: '',
    contractorEmail: '',
    contractorMobile: '',
    contractorQuote: '',
    contractorAdvance: '',
    contractorBalance: '',
    standDesign: null,
    posterChecklist: false,
    samplesPallet: '',
    samplesWeight: '',
    samplesDimensions: '',
    pallets: [{ name: '', weight: '', dimensions: '' }],
    samplesPackingList: null,
    samplesDispatchChecklist: false,
    logisticsCompany: '',
    logisticsContact: '',
    logisticsEmail: '',
    logisticsMobile: '',
    logisticsQuote: '',
    logisticsPayment: '',
    logisticsAwb: '',
    logisticsSamples: '',
    paymentChecklist: false,
    remarks: '',
    insuranceChecklist: false,
    insuranceFile: null,
  };

  const [form, setForm] = useState(initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getAllUsers().then(res => {
      if (res.success) setAvailableUsers(res.data);
    }).catch(err => console.error('Failed to load users', err));
  }, []);

  useEffect(() => {
    const totalDeposited = (form.deposits || []).reduce((sum, dep) => sum + Number(dep.amount || 0), 0);
    const isPaymentComplete = (form.totalPayment || 0) > 0 && totalDeposited >= Number(form.totalPayment);
    const isBadgeComplete = form.exhibitors?.length > 0 && form.exhibitors.every(ex => !!ex.idCard);
    const isPosterComplete = !!form.contractorCompany;
    const lastPallet = form.pallets && form.pallets.length > 0 ? form.pallets[form.pallets.length - 1] : null;
    const isSamplesComplete = lastPallet && !!lastPallet.name && !!lastPallet.weight && !!lastPallet.dimensions;

    const updates = {};
    let changed = false;

    if (form.paymentChecklist !== isPaymentComplete) {
      updates.paymentChecklist = isPaymentComplete;
      changed = true;
    }
    if (form.badgeChecklist !== isBadgeComplete) {
      updates.badgeChecklist = isBadgeComplete;
      changed = true;
    }
    if (form.posterChecklist !== isPosterComplete) {
      updates.posterChecklist = isPosterComplete;
      changed = true;
    }
    if (form.samplesDispatchChecklist !== isSamplesComplete) {
      updates.samplesDispatchChecklist = isSamplesComplete;
      changed = true;
    }

    const quote = parseFloat(String(form.contractorQuote || '0').replace(/[^0-9.]/g, '')) || 0;
    const advance = parseFloat(String(form.contractorAdvance || '0').replace(/[^0-9.]/g, '')) || 0;
    const balance = quote - advance;
    const balanceStr = balance.toString();

    if (form.contractorBalance !== balanceStr && (quote > 0 || advance > 0)) {
      updates.contractorBalance = balanceStr;
      changed = true;
    }

    if (changed) {
      setForm(prev => ({ ...prev, ...updates }));
    }
  }, [form.deposits, form.totalPayment, form.exhibitors, form.contractorCompany, form.pallets, form.paymentChecklist, form.badgeChecklist, form.posterChecklist, form.samplesDispatchChecklist, form.contractorQuote, form.contractorAdvance, form.contractorBalance]);

  useEffect(() => {
    if (id) {
      loadChecklist();
    }
  }, [id]);

  const loadChecklist = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getExhibitionChecklist(id);
      if (res.success && res.data) {
        const data = res.data;
        setForm({
          standNumber: data.standNumber || '',
          standType: data.standType || '',
          dimensions: data.dimensions || '',
          perfInvoice: data.perfInvoice || null,
          totalPayment: data.totalPayment || 0,
          deposits: data.deposits || [],
          portalLink: data.portalLink || '',
          portalId: data.portalId || '',
          portalPasscode: data.portalPasscode || '',
          exhibitors: data.exhibitors && Array.isArray(data.exhibitors) && data.exhibitors.length > 0
            ? data.exhibitors
            : (data.exhibitorName || data.exhibitorMobile
              ? [{ name: data.exhibitorName || '', designation: data.exhibitorDesignation || '', email: data.exhibitorEmail || '', mobile: data.exhibitorMobile || '', idCard: data.exhibitorIdCard || null }]
              : [{ name: '', designation: '', email: '', mobile: '', idCard: null }]),
          badgeChecklist: data.badgeChecklist || false,
          accommodationDetails: data.accommodationDetails || '',
          ticketsDetails: data.ticketsDetails || '',
          tickets: data.tickets || [],
          accommodationChecklist: data.accommodationChecklist || false,
          contractorCompany: data.contractorCompany || '',
          contractorPerson: data.contractorPerson || '',
          contractorEmail: data.contractorEmail || '',
          contractorMobile: data.contractorMobile || '',
          contractorQuote: data.contractorQuote || '',
          contractorAdvance: data.contractorAdvance || '',
          contractorBalance: data.contractorBalance || '',
          standDesign: data.standDesign || null,
          posterChecklist: data.posterChecklist || false,
          samplesPallet: data.samplesPallet || '',
          samplesWeight: data.samplesWeight || '',
          samplesDimensions: data.samplesDimensions || '',
          pallets: (data.pallets && data.pallets.length > 0)
            ? data.pallets
            : (data.samplesPallet || data.samplesWeight || data.samplesDimensions)
              ? [{ name: data.samplesPallet || '', weight: data.samplesWeight || '', dimensions: data.samplesDimensions || '' }]
              : [{ name: '', weight: '', dimensions: '' }],
          samplesPackingList: data.samplesPackingList || null,
          samplesDispatchChecklist: data.samplesDispatchChecklist || false,
          logisticsCompany: data.logisticsCompany || '',
          logisticsContact: data.logisticsContact || '',
          logisticsEmail: data.logisticsEmail || '',
          logisticsMobile: data.logisticsMobile || '',
          logisticsQuote: data.logisticsQuote || '',
          logisticsPayment: data.logisticsPayment || '',
          logisticsAwb: data.logisticsAwb || '',
          logisticsSamples: data.logisticsSamples || '',
          paymentChecklist: data.paymentChecklist || false,
          remarks: data.remarks || '',
          insuranceChecklist: data.insuranceChecklist || false,
          insuranceFile: data.insuranceFile || null,
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load checklist data' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  const addExhibitor = () => {
    setForm(prev => ({
      ...prev,
      exhibitors: [...(prev.exhibitors || []), { name: '', designation: '', email: '', mobile: '' }]
    }));
  };

  const removeExhibitor = (index) => {
    if (form.exhibitors.length <= 1) {
      setMessage({ type: 'error', text: 'At least one exhibitor is required' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    setForm(prev => ({
      ...prev,
      exhibitors: prev.exhibitors.filter((_, i) => i !== index)
    }));
  };

  const updateExhibitor = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      exhibitors: prev.exhibitors.map((exhibitor, i) =>
        i === index ? { ...exhibitor, [field]: value } : exhibitor
      )
    }));
  };

  const handleExhibitorFile = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, [`exhibitor_id_${idx}`]: 'Only PDF and JPEG files are allowed.' }));
      e.target.value = '';
      return;
    }

    const MAX_SIZE = file.type === 'application/pdf'
      ? 10 * 1024 * 1024
      : 2 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      const maxSizeMB = file.type === 'application/pdf' ? '10MB' : '2MB';
      setErrors(prev => ({ ...prev, [`exhibitor_id_${idx}`]: `File limit exceeded. Maximum size is ${maxSizeMB}.` }));
      e.target.value = '';
      return;
    }

    setErrors(prev => ({ ...prev, [`exhibitor_id_${idx}`]: null }));
    updateExhibitor(idx, 'idCard', file);
  };

  const getExhibitorIdCardName = (value, index) => {
    if (value instanceof File) return value.name;
    if (typeof value === 'string' && value.startsWith('data:')) {
      return `ID Card ${index + 1} (uploaded)`;
    }
    return 'ID Card (uploaded)';
  };

  const handleUserSelect = (index, userId) => {
    const user = availableUsers.find(u => u._id === userId);
    if (user) {
      setForm(prev => ({
        ...prev,
        exhibitors: prev.exhibitors.map((ex, i) =>
          i === index ? {
            ...ex,
            name: user.name,
            email: user.email,
            designation: user.designation || '',
            mobile: user.phoneNumber || ''
          } : ex
        )
      }));
    }
  };

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) {
      handleChange(field, null);
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only PDF and JPEG files are allowed.' });
      e.target.value = '';
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const MAX_SIZE = file.type === 'application/pdf'
      ? 10 * 1024 * 1024
      : 2 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      const maxSizeMB = file.type === 'application/pdf' ? '10MB' : '2MB';
      setErrors(prev => ({ ...prev, [field]: `File limit exceeded. Maximum size is ${maxSizeMB}.` }));
      e.target.value = '';
      return;
    }

    setErrors(prev => ({ ...prev, [field]: null }));
    handleChange(field, file);
  };

  const viewFileInNewTab = (file) => {
    if (!file) return;

    try {
      let fileUrl;

      if (file instanceof File) {
        fileUrl = URL.createObjectURL(file);
      } else if (typeof file === 'string') {
        if (file.startsWith('data:')) {
          const mimeType = file.match(/^data:(.+?);base64,/)[1];
          const base64Data = file.split(',')[1];

          if (mimeType && base64Data) {
            try {
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: mimeType });
              fileUrl = URL.createObjectURL(blob);
            } catch (error) {
              console.error('Error processing base64:', error);
              fileUrl = file;
            }
          } else {
            fileUrl = file;
          }
        } else {
          console.warn('Unexpected file format:', file);
          return;
        }
      } else {
        console.warn('Unknown file type:', typeof file);
        return;
      }

      const newWindow = window.open(fileUrl, '_blank');

      if (file instanceof File || (typeof file === 'string' && file.startsWith('data:'))) {
        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      setMessage({ type: 'error', text: 'Failed to open file' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const deleteFile = (field) => {
    if (!isEditing) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this file? This action cannot be undone.');
    if (!confirmDelete) return;

    handleChange(field, null);
    setMessage({ type: 'success', text: 'File deleted successfully' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSave = async () => {
    if (!id) {
      setMessage({ type: 'error', text: 'No exhibition ID found. Please access this form from an exhibition.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();

      const textFields = [
        'standNumber', 'standType', 'dimensions', 'portalLink', 'portalId', 'portalPasscode',
        'accommodationDetails', 'ticketsDetails',
        'contractorCompany', 'contractorPerson', 'contractorEmail', 'contractorMobile',
        'contractorQuote', 'contractorAdvance', 'contractorBalance',
        'samplesPallet', 'samplesWeight', 'samplesDimensions',
        'logisticsCompany', 'logisticsContact', 'logisticsEmail', 'logisticsMobile',
        'logisticsQuote', 'logisticsPayment', 'logisticsAwb', 'logisticsSamples',
        'remarks', 'totalPayment'
      ];

      textFields.forEach(key => {
        formData.append(key, form[key] || '');
      });

      const exhibitorsMetadata = (form.exhibitors || []).map(ex => ({
        ...ex,
        idCard: (ex.idCard instanceof File) ? "" : ex.idCard
      }));
      formData.append('exhibitors', JSON.stringify(exhibitorsMetadata));

      const booleanFields = [
        'paymentChecklist', 'badgeChecklist', 'accommodationChecklist',
        'posterChecklist', 'samplesDispatchChecklist', 'insuranceChecklist'
      ];
      booleanFields.forEach(key => {
        formData.append(key, form[key] ? 'true' : 'false');
      });

      if (form.perfInvoice instanceof File) {
        formData.append('perfInvoice', form.perfInvoice);
      }

      const depositMetadata = (form.deposits || []).map(dep => ({
        amount: dep.amount,
        payslip: (dep.payslip instanceof File) ? "" : dep.payslip
      }));
      formData.append('deposits', JSON.stringify(depositMetadata));

      (form.deposits || []).forEach(dep => {
        if (dep.payslip instanceof File) {
          formData.append('payslip', dep.payslip);
        }
      });

      const ticketMetadata = (form.tickets || []).map(t => ({
        file: (t.file instanceof File) ? "" : t.file
      }));
      formData.append('tickets', JSON.stringify(ticketMetadata));

      (form.tickets || []).forEach(t => {
        if (t.file instanceof File) {
          formData.append('ticketFile', t.file);
        }
      });

      formData.append('pallets', JSON.stringify(form.pallets || []));

      if (form.standDesign instanceof File) {
        formData.append('standDesign', form.standDesign);
      }
      if (form.samplesPackingList instanceof File) {
        formData.append('samplesPackingList', form.samplesPackingList);
      }
      if (form.insuranceFile instanceof File) {
        formData.append('insuranceFile', form.insuranceFile);
      }

      (form.exhibitors || []).forEach(ex => {
        if (ex.idCard instanceof File) {
          formData.append('exhibitorIdCard', ex.idCard);
        }
      });

      const res = await updateExhibitionChecklist(id, formData);
      if (res.success) {
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Checklist saved successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        await loadChecklist();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save checklist' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage({ type: 'success', text: 'Edit mode enabled. You can now modify all fields.' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const hasPdf = (field) => {
    const value = form[field];
    return value && (value instanceof File || (typeof value === 'string' && value.startsWith('data:')));
  };

  const getPdfName = (field) => {
    const value = form[field];
    if (value instanceof File) return value.name;
    if (typeof value === 'string' && value.startsWith('data:')) {
      return field === 'perfInvoice' ? 'Performa Invoice (uploaded)' :
        field === 'paymentProof' ? 'Payment Proof (uploaded)' :
          field === 'standDesign' ? 'Stand Design (uploaded)' :
            field === 'samplesPackingList' ? 'Packing List (uploaded)' :
              field === 'insuranceFile' ? 'Insurance File (uploaded)' : 'PDF (uploaded)';
    }
    return null;
  };

  const getMultiPdfName = (value, index) => {
    if (value instanceof File) return value.name;
    if (typeof value === 'string' && value.startsWith('data:')) {
      return `Payslip ${index + 1} (uploaded)`;
    }
    return 'PDF (uploaded)';
  };

  const totalDeposited = (form.deposits || []).reduce((sum, dep) => sum + Number(dep.amount || 0), 0);
  const remainingBalance = Math.max(0, (form.totalPayment || 0) - totalDeposited);
  const isPaymentComplete = (form.totalPayment || 0) > 0 && totalDeposited >= form.totalPayment;

  const addDeposit = () => {
    setForm(prev => ({
      ...prev,
      deposits: [...(prev.deposits || []), { amount: '', payslip: null }]
    }));
  };

  const updateDeposit = (idx, field, value) => {
    setForm(prev => ({
      ...prev,
      deposits: prev.deposits.map((dep, i) => i === idx ? { ...dep, [field]: value } : dep)
    }));
  };

  const handleDepositFile = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'Only PDF files are allowed' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      e.target.value = '';
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrors(prev => ({ ...prev, [`deposit_${idx}`]: 'PDF limit exceeded. Maximum size is 10MB.' }));
      e.target.value = '';
      return;
    }

    setErrors(prev => ({ ...prev, [`deposit_${idx}`]: null }));
    updateDeposit(idx, 'payslip', file);
  };

  const removeDeposit = (idx) => {
    setForm(prev => ({
      ...prev,
      deposits: prev.deposits.filter((_, i) => i !== idx)
    }));
  };

  const addTicket = () => {
    setForm(prev => ({
      ...prev,
      tickets: [...(prev.tickets || []), { file: null }]
    }));
  };

  const removeTicket = (idx) => {
    setForm(prev => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== idx)
    }));
  };

  const handleTicketFile = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only PDF and JPEG files are allowed' });
      e.target.value = '';
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const MAX_SIZE = file.type === 'application/pdf'
      ? 10 * 1024 * 1024
      : 2 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      const maxSizeMB = file.type === 'application/pdf' ? '10MB' : '2MB';
      setErrors(prev => ({ ...prev, [`ticket_${idx}`]: `File limit exceeded. Maximum size is ${maxSizeMB}.` }));
      e.target.value = '';
      return;
    }

    setErrors(prev => ({ ...prev, [`ticket_${idx}`]: null }));
    setForm(prev => ({
      ...prev,
      tickets: prev.tickets.map((t, i) => i === idx ? { ...t, file } : t)
    }));
  };

  const getTicketFileName = (value, index) => {
    if (value instanceof File) return value.name;
    if (typeof value === 'string' && value.startsWith('data:')) {
      return `Ticket ${index + 1} (uploaded)`;
    }
    return 'Ticket (uploaded)';
  };

  const addPallet = () => {
    setForm(prev => ({
      ...prev,
      pallets: [...(prev.pallets || []), { name: '', weight: '', dimensions: '' }]
    }));
  };

  const removePallet = (index) => {
    if (form.pallets.length <= 1) {
      updatePallet(index, 'name', '');
      updatePallet(index, 'weight', '');
      updatePallet(index, 'dimensions', '');
      return;
    }
    setForm(prev => ({
      ...prev,
      pallets: prev.pallets.filter((_, i) => i !== index)
    }));
  };

  const updatePallet = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      pallets: prev.pallets.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading checklist data...</p>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          No exhibition ID provided. Please access this form from an exhibition.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <div className="bg-white">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase">Standard Checklist</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Exhibition Workspace</h1>
              <p className="text-sm text-gray-600 mt-1">Capture every detail required by operations, finance and logistics.</p>
            </div>
            <div className="flex gap-3">
              <button 
                className="flex-1 lg:flex-initial px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition flex items-center justify-center gap-2 text-sm"
                onClick={handleEdit} 
                disabled={isEditing || saving}
              >
                <FiEdit2 size={18} /> Edit
              </button>
              <button 
                className="flex-1 lg:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 text-sm"
                onClick={handleSave} 
                disabled={!isEditing || saving}
              >
                <FiSave size={18} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </header>

        {/* Messages */}
        {message.text && (
          <div className={`mx-4 lg:mx-8 mt-4 p-4 rounded-lg border text-sm ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Form Content */}
      <div className="px-4 lg:px-8 py-6 space-y-8 max-w-6xl mx-auto">
        {/* Checklists */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Checklist</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CHECKLISTS.map(item => {
              const isAutomated = ['paymentChecklist', 'badgeChecklist', 'posterChecklist', 'samplesDispatchChecklist'].includes(item.name);
              const isChecked = !!form[item.name];

              return (
                <label key={item.name} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer" style={{
                  cursor: isAutomated ? 'default' : 'pointer',
                  color: isChecked ? '#10b981' : 'inherit',
                  backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.03)' : 'transparent'
                }}>
                  {isAutomated ? (
                    isChecked ? <FiCheckCircle style={{ color: '#10b981', flexShrink: 0 }} /> : <div style={{ width: '16px', height: '16px', border: '1px solid #ccc', borderRadius: '4px', flexShrink: 0 }} />
                  ) : (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!isEditing}
                      onChange={(e) => handleChange(item.name, e.target.checked)}
                      className="w-4 h-4"
                    />
                  )}
                  <span className="text-sm font-medium">{item.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Stand Details */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Stand Details</h2>
          <p className="text-sm text-gray-600 mb-6">Basic information for raw/shell stand reservations.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {STAND_FIELDS.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label} <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder={field.placeholder}
                  value={form[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            ))}
          </div>

          {/* Performa Invoice */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Performa Invoice (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              disabled={!isEditing}
              onChange={(e) => handleFileChange('perfInvoice', e)}
              className="w-full text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Max: 10MB</p>
            {errors.perfInvoice && <p className="text-xs text-red-600 mt-2">{errors.perfInvoice}</p>}
            {hasPdf('perfInvoice') && (
              <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-700 flex-1">{getPdfName('perfInvoice')}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition text-xs font-medium"
                    onClick={() => viewFileInNewTab(form.perfInvoice)}
                  >
                    View
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition text-xs font-medium"
                      onClick={() => deleteFile('perfInvoice')}
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Total Payment */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Total Exhibition Payment (Currency)</label>
            <input
              type="number"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              placeholder="e.g. 10000"
              value={form.totalPayment}
              onChange={(e) => handleChange('totalPayment', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          {/* Payment Tracker */}
          <div className="mt-8 p-4 lg:p-6 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <h3 className="text-base font-bold text-gray-900">Payment Deposits Tracker</h3>
              {isPaymentComplete && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 whitespace-nowrap">
                  PAYMENT COMPLETED
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Total Deposited</p>
                <p className="text-2xl font-bold text-gray-900">{totalDeposited.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Remaining</p>
                <p className="text-2xl font-bold" style={{ color: remainingBalance > 0 ? '#ef4444' : '#10b981' }}>{remainingBalance.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3">
              {(form.deposits || []).map((dep, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Amount</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="0.00"
                        value={dep.amount}
                        disabled={!isEditing}
                        onChange={(e) => updateDeposit(idx, 'amount', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Payslip (PDF)</label>
                      <input
                        type="file"
                        accept="application/pdf"
                        disabled={!isEditing}
                        onChange={(e) => handleDepositFile(idx, e)}
                        className="w-full text-sm"
                      />
                    </div>
                  </div>
                  {errors[`deposit_${idx}`] && <p className="text-xs text-red-600 mb-2">{errors[`deposit_${idx}`]}</p>}
                  {dep.payslip && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-700">{getMultiPdfName(dep.payslip, idx)}</span>
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium"
                        onClick={() => viewFileInNewTab(dep.payslip)}
                      >
                        View
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isEditing && !isPaymentComplete && (
              <button
                className="w-full mt-4 px-4 py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2 text-sm"
                onClick={addDeposit}
              >
                <FiPlus size={18} /> Add Next Deposit
              </button>
            )}
          </div>

          {/* Insurance */}
          <div className="mt-8">
            <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.insuranceChecklist}
                disabled={!isEditing}
                onChange={(e) => handleChange('insuranceChecklist', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-semibold text-gray-900">Insurance Taken?</span>
            </label>
            {form.insuranceChecklist && (
              <div className="mt-4 p-4 rounded-lg border border-blue-300 bg-blue-50">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Upload Insurance Document (PDF)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={!isEditing}
                  onChange={(e) => handleFileChange('insuranceFile', e)}
                  className="w-full text-sm mb-2"
                />
                <p className="text-xs text-gray-500 mb-2">Max: 10MB</p>
                {errors.insuranceFile && <p className="text-xs text-red-600 mb-2">{errors.insuranceFile}</p>}
                {hasPdf('insuranceFile') && (
                  <div className="mt-3 p-3 rounded-lg bg-white border border-blue-200 flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-gray-700 flex-1">{getPdfName('insuranceFile')}</span>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium"
                      onClick={() => viewFileInNewTab(form.insuranceFile)}
                    >
                      View
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Exhibition Portal */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Exhibition Portal</h2>
          <p className="text-sm text-gray-600 mb-6">Login credentials provided by the organiser.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Portal Link</label>
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="https://portal.example.com"
                  value={form.portalLink}
                  onChange={(e) => handleChange('portalLink', e.target.value)}
                  disabled={!isEditing}
                />
                {!isEditing && form.portalLink && (
                  <a
                    href={form.portalLink.startsWith('http') ? form.portalLink : `https://${form.portalLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium whitespace-nowrap"
                  >
                    Open Link
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Portal ID</label>
              <input
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                placeholder="username / exhibitor id"
                value={form.portalId}
                onChange={(e) => handleChange('portalId', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Portal Passcode</label>
              <input
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                placeholder="••••••••"
                value={form.portalPasscode}
                onChange={(e) => handleChange('portalPasscode', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </section>

        {/* Exhibitors */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Company Exhibitors</h2>
              <p className="text-sm text-gray-600 mt-1">At least one exhibitor is mandatory. You can add multiple exhibitors.</p>
            </div>
            {isEditing && (
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                onClick={addExhibitor}
              >
                <FiPlus size={18} /> Add Exhibitor
              </button>
            )}
          </div>

          {(form.exhibitors || []).map((exhibitor, index) => (
            <div key={index} className="p-4 lg:p-6 rounded-lg border border-blue-200 bg-blue-50 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="text-base font-bold text-gray-900">Exhibitor {index + 1}</h3>
                {isEditing && form.exhibitors.length > 1 && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2 text-sm"
                    onClick={() => removeExhibitor(index)}
                  >
                    <FiTrash2 size={16} /> Remove
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select User to Autofill</label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                    onChange={(e) => handleUserSelect(index, e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Select a user to autofill...</option>
                    {availableUsers.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.designation ? `(${u.designation})` : ''} - {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name <span className="text-red-600">*</span></label>
                  <input
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Primary attendee"
                    value={exhibitor.name || ''}
                    onChange={(e) => updateExhibitor(index, 'name', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Designation</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="e.g. Technical Consultant"
                    value={exhibitor.designation || ''}
                    onChange={(e) => updateExhibitor(index, 'designation', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email ID</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="name@company.com"
                    value={exhibitor.email || ''}
                    onChange={(e) => updateExhibitor(index, 'email', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number <span className="text-red-600">*</span></label>
                  <input
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="+44 (0) 7444 045 025"
                    value={exhibitor.mobile || ''}
                    onChange={(e) => updateExhibitor(index, 'mobile', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ID Card (PDF/JPEG)</label>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/jpg"
                    disabled={!isEditing}
                    onChange={(e) => handleExhibitorFile(index, e)}
                    className="w-full text-sm mb-2"
                  />
                  <p className="text-xs text-gray-500 mb-2">Max: 10MB PDF, 2MB Image</p>
                  {errors[`exhibitor_id_${index}`] && <p className="text-xs text-red-600 mb-2">{errors[`exhibitor_id_${index}`]}</p>}
                  {exhibitor.idCard && (
                    <div className="p-3 rounded-lg bg-white border border-blue-200 flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-700 flex-1">{getExhibitorIdCardName(exhibitor.idCard, index)}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium"
                          onClick={() => viewFileInNewTab(exhibitor.idCard)}
                        >
                          View
                        </button>
                        {isEditing && (
                          <button
                            type="button"
                            className="px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium"
                            onClick={() => {
                              if (window.confirm('Delete this ID card?')) {
                                updateExhibitor(index, 'idCard', null);
                              }
                            }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer mb-6" style={{
            color: form.badgeChecklist ? '#10b981' : 'inherit',
            backgroundColor: form.badgeChecklist ? 'rgba(16, 185, 129, 0.03)' : 'transparent'
          }}>
            {form.badgeChecklist ? <FiCheckCircle size={20} style={{ color: '#10b981' }} /> : <div style={{ width: '16px', height: '16px', border: '1px solid #ccc', borderRadius: '4px' }} />}
            <span className="font-medium">Exhibitor badges submitted (Auto-checked when IDs uploaded)</span>
          </label>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Accommodation & Tickets</label>
              <textarea
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm resize-none"
                rows={3}
                placeholder="Hotel name, booking reference, ticket numbers"
                value={form.accommodationDetails}
                onChange={(e) => handleChange('accommodationDetails', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tickets / Travel Notes</label>
              <textarea
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm resize-none"
                rows={3}
                placeholder="Flight numbers, check-in info"
                value={form.ticketsDetails}
                onChange={(e) => handleChange('ticketsDetails', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Uploaded Tickets (PDF/JPEG)</label>
              {(form.tickets || []).map((ticket, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/jpg"
                    disabled={!isEditing}
                    onChange={(e) => handleTicketFile(idx, e)}
                    className="w-full text-sm mb-2"
                  />
                  <p className="text-xs text-gray-500 mb-2">Max: 10MB PDF, 2MB Image</p>
                  {errors[`ticket_${idx}`] && <p className="text-xs text-red-600 mb-2">{errors[`ticket_${idx}`]}</p>}
                  {ticket.file && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-700">{getTicketFileName(ticket.file, idx)}</span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 text-xs font-medium"
                        onClick={() => viewFileInNewTab(ticket.file)}
                      >
                        View
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isEditing && (
                <button
                  type="button"
                  className="w-full px-4 py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2 text-sm"
                  onClick={addTicket}
                >
                  <FiPlus size={18} /> Add Ticket
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Stand Contractor</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {CONTRACTOR_FIELDS.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label}</label>
                <input
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm disabled:bg-gray-100"
                  placeholder={field.placeholder}
                  value={form[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  disabled={!isEditing || field.name === 'contractorBalance'}
                />
              </div>
            ))}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Stand Design (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              disabled={!isEditing}
              onChange={(e) => handleFileChange('standDesign', e)}
              className="w-full text-sm mb-2"
            />
            <p className="text-xs text-gray-500 mb-2">Max: 10MB</p>
            {errors.standDesign && <p className="text-xs text-red-600 mb-2">{errors.standDesign}</p>}
            {hasPdf('standDesign') && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-700 flex-1">{getPdfName('standDesign')}</span>
                <button
                  type="button"
                  className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium"
                  onClick={() => viewFileInNewTab(form.standDesign)}
                >
                  View
                </button>
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer mt-6" style={{
            color: form.posterChecklist ? '#10b981' : 'inherit',
            backgroundColor: form.posterChecklist ? 'rgba(16, 185, 129, 0.03)' : 'transparent'
          }}>
            {form.posterChecklist ? <FiCheckCircle size={20} style={{ color: '#10b981' }} /> : <div style={{ width: '16px', height: '16px', border: '1px solid #ccc', borderRadius: '4px' }} />}
            <span className="font-medium">Exhibition posters ready (Auto-checked when contractor filled)</span>
          </label>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Samples & Logistics</h2>

          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <label className="text-sm font-semibold text-gray-700">Dispatch Pallets / Boxes</label>
              {isEditing && (
                <button 
                  type="button" 
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 whitespace-nowrap"
                  onClick={addPallet}
                >
                  <FiPlus size={16} /> Add Pallet
                </button>
              )}
            </div>

            {(form.pallets || []).map((pallet, index) => (
              <div key={index} className="p-4 rounded-lg border border-gray-200 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Name / ID</label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                      placeholder="Pallet A / Box 1"
                      value={pallet.name}
                      onChange={(e) => updatePallet(index, 'name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Weight</label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                      placeholder="150 kg"
                      value={pallet.weight}
                      onChange={(e) => updatePallet(index, 'weight', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Dimensions</label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="L x W x H"
                        value={pallet.dimensions}
                        onChange={(e) => updatePallet(index, 'dimensions', e.target.value)}
                        disabled={!isEditing}
                      />
                      {isEditing && (form.pallets || []).length > 1 && (
                        <button
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          onClick={() => removePallet(index)}
                          title="Remove Pallet"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Packaging List (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              disabled={!isEditing}
              onChange={(e) => handleFileChange('samplesPackingList', e)}
              className="w-full text-sm mb-2"
            />
            <p className="text-xs text-gray-500 mb-2">Max: 10MB</p>
            {errors.samplesPackingList && <p className="text-xs text-red-600 mb-2">{errors.samplesPackingList}</p>}
            {hasPdf('samplesPackingList') && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-700 flex-1">{getPdfName('samplesPackingList')}</span>
                <button
                  type="button"
                  className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium"
                  onClick={() => viewFileInNewTab(form.samplesPackingList)}
                >
                  View
                </button>
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer mb-8" style={{
            color: form.samplesDispatchChecklist ? '#10b981' : 'inherit',
            backgroundColor: form.samplesDispatchChecklist ? 'rgba(16, 185, 129, 0.03)' : 'transparent'
          }}>
            {form.samplesDispatchChecklist ? <FiCheckCircle size={20} style={{ color: '#10b981' }} /> : <div style={{ width: '16px', height: '16px', border: '1px solid #ccc', borderRadius: '4px' }} />}
            <span className="font-medium">Samples dispatch confirmed (Auto-checked when pallets filled)</span>
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {LOGISTICS_FIELDS.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label}</label>
                <input
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                  placeholder={field.placeholder}
                  value={form[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Additional Remarks</h2>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
          <textarea
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm resize-none"
            placeholder="Add any additional notes or internal remarks here..."
            value={form.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            disabled={!isEditing}
            style={{ minHeight: '120px' }}
          />
        </section>
      </div>
    </div>
  );
}