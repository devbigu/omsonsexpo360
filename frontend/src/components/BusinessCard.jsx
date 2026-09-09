import { useEffect, useRef, useState } from 'react';
import { saveCardEntry, extractOcr } from '../services/api.js';
import { FiUpload, FiImage, FiMic, FiStopCircle, FiTrash2, FiX } from 'react-icons/fi';

const TYPE_OF_VISITOR_OPTIONS = [
  { value: '', label: 'Select Type of Visitor' },
  { value: 'ENDUSER', label: 'ENDUSER' },
  { value: 'DEALER', label: 'DEALER' },
  { value: 'CONSULTANT', label: 'CONSULTANT' },
  { value: 'DOMESTIC', label: 'DOMESTIC' },
  { value: 'INTERNATIONAL', label: 'INTERNATIONAL' }
];

const INTERESTED_PRODUCTS_OPTIONS = [
  { value: 'LAB GLASSWARE', label: 'LAB GLASSWARE' },
  { value: 'PLASTICWARE', label: 'PLASTICWARE' },
  { value: 'FILTERATION', label: 'FILTERATION' },
  { value: 'INSTRUMENTS', label: 'INSTRUMENTS' },
  { value: 'HYDROMETERS', label: 'HYDROMETERS' },
  { value: 'THERMOMETERS', label: 'THERMOMETERS' }
];

const DEFAULT_FIELDS = {
  companyName: '',
  contactPerson: '',
  designation: '',
  mobile: '',
  email: '',
  address: '',
  website: '',
  typeOfVisitor: '',
  interestedProducts: [],
  remarks: ''
};

export default function BusinessCard({ activeExhibition }) {
  const [imageFiles, setImageFiles] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [fields, setFields] = useState({ ...DEFAULT_FIELDS });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState({ ocr: false, save: false });
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const isLive = activeExhibition && activeExhibition.isLive;
  const MAX_IMAGES = 5;

  useEffect(() => {
    if (activeExhibition && !isLive) {
      showMessage('This exhibition is not live. You can view cards in the dashboard.', 'info');
    }
  }, [activeExhibition, isLive]);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    window.clearTimeout(showMessage._t);
    showMessage._t = window.setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const validFiles = files.filter(file => validTypes.includes(file.type));

    if (validFiles.length !== files.length) {
      showMessage('Only JPEG, JPG, and PNG files are allowed', 'error');
    }

    if (validFiles.length === 0) return;

    const remainingSlots = MAX_IMAGES - imageFiles.length;
    if (remainingSlots <= 0) {
      showMessage(`Maximum ${MAX_IMAGES} images allowed`, 'error');
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    const newFiles = [...imageFiles, ...filesToAdd];
    setImageFiles(newFiles);

    // Auto-run OCR on first image if no fields are filled
    if (imageFiles.length === 0 && filesToAdd.length > 0) {
      try {
        setLoading((s) => ({ ...s, ocr: true }));
        const result = await extractOcr(filesToAdd[0]);
        if (result?.success && result.fields) {
          const extracted = result.fields;
          setFields(prev => ({
            ...prev,
            companyName: extracted.companyName || extracted.company || prev.companyName,
            contactPerson: extracted.contactPerson || extracted.name || prev.contactPerson,
            designation: extracted.designation || extracted.title || prev.designation,
            email: extracted.email || prev.email,
            mobile: extracted.mobile || extracted.phone || prev.mobile,
            address: extracted.address || prev.address,
            website: extracted.website || prev.website,
            typeOfVisitor: extracted.typeOfVisitor || prev.typeOfVisitor,
            interestedProducts: Array.isArray(extracted.interestedProducts) ? extracted.interestedProducts : prev.interestedProducts,
            remarks: extracted.remarks || prev.remarks
          }));
          showMessage('OCR extracted successfully', 'success');
        }
      } catch (e1) {
        showMessage('OCR failed to auto-extract', 'error');
      } finally {
        setLoading((s) => ({ ...s, ocr: false }));
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onRecord = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        showMessage('Audio recording not supported in this browser', 'error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data && e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (e) {
      showMessage(`Cannot start recording: ${e.message}`, 'error');
    }
  };

  const onStop = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch (e) {
      showMessage('Failed to stop recording', 'error');
    }
  };

  const onDeleteAudio = () => setAudioBlob(null);

  const handleChange = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleProductToggle = (product) => {
    setFields((prev) => {
      const current = prev.interestedProducts || [];
      const updated = current.includes(product)
        ? current.filter(p => p !== product)
        : [...current, product];
      return { ...prev, interestedProducts: updated };
    });
  };

  const handleSave = async () => {
    try {
      setLoading((s) => ({ ...s, save: true }));
      const result = await saveCardEntry(imageFiles, audioBlob, fields, activeExhibition?._id ?? null, activeExhibition?.createdBy ?? '');
      if (result?.success) {
        showMessage('Card saved successfully!', 'success');
        setFields({ ...DEFAULT_FIELDS });
        setImageFiles([]);
        setAudioBlob(null);
      } else {
        showMessage(result?.message || 'Failed to save card', 'error');
      }
    } catch (e) {
      showMessage(e.message || 'Save failed', 'error');
    } finally {
      setLoading((s) => ({ ...s, save: false }));
    }
  };

  const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : '';
  const imageUrls = imageFiles.map(file => URL.createObjectURL(file));

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    imageUrls.forEach(url => URL.revokeObjectURL(url));
  }, [audioUrl, imageUrls]);

  return (
    <div className="card-page">
      {activeExhibition ? (
        <div style={{ marginBottom: 12, wordWrap: 'break-word', maxWidth: '100%' }}>
          <strong>Active Exhibition:</strong> {activeExhibition.name} (Date: {new Date(activeExhibition.startTime).toLocaleDateString()})
        </div>
      ) : (
        <div style={{ marginBottom: 12, wordWrap: 'break-word', maxWidth: '100%' }}>
          <em>No active exhibition selected. Save will create a standalone card.</em>
        </div>
      )}
      {message.text && (
        <div className={`msg ${message.type}`}>{message.text}</div>
      )}

      {(loading.ocr || loading.save) && <div className="loader" aria-busy="true" />}

      {imageFiles.length === 0 && (
        <label className="upload-box">
          <input
            type="file"
            accept="image/jpeg, image/png, image/jpg"
            onChange={onPickImages}
            multiple
            hidden
            ref={fileInputRef}
          />
          <div className="upload-icon" aria-hidden><FiUpload size={42} /></div>
          <div className="upload-text">Tap to upload business card images</div>
          <div className="upload-sub">You can upload up to {MAX_IMAGES} images</div>
        </label>
      )}

      {imageFiles.length > 0 && (
        <div style={{ marginBottom: '20px', width: '100%', maxWidth: '100%' }}>
          <div className="image-preview-grid">
            {imageFiles.map((file, index) => (
              <div key={index} className="image-preview-item">
                <img
                  src={imageUrls[index]}
                  alt={`Preview ${index + 1}`}
                  className="image-preview-img"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="image-preview-remove"
                >
                  <FiX size={16} />
                </button>
              </div>
            ))}
          </div>
          {imageFiles.length < MAX_IMAGES && (
            <label className="btn" style={{ marginBottom: '12px' }}>
              <input
                type="file"
                accept="image/jpeg, image/png, image/jpg"
                onChange={onPickImages}
                multiple
                hidden
                ref={fileInputRef}
              />
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <FiImage /> Add More Images ({imageFiles.length}/{MAX_IMAGES})
              </span>
            </label>
          )}
        </div>
      )}

      <div className="actions">
        {imageFiles.length === 0 && (
          <label className="btn">
            <input
              type="file"
              accept="image/jpeg, image/png, image/jpg"
              capture="environment"
              onChange={onPickImages}
              multiple
              hidden
              ref={fileInputRef}
            />
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <FiImage /> Upload
            </span>
          </label>
        )}

        {!isRecording ? (
          <button className="btn" onClick={onRecord}>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <FiMic /> Record
            </span>
          </button>
        ) : (
          <button className="btn danger" onClick={onStop}>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <FiStopCircle /> Stop
            </span>
          </button>
        )}
      </div>

      {isRecording && (
        <div className="waveform" aria-live="polite">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="wave" style={{ height: `${30 + (i % 5) * 6}px` }} />
          ))}
        </div>
      )}

      {audioBlob && (
        <div className="audio-box">
          <div className="audio-title">Audio Recording</div>
          <div className="audio-controls">
            <audio controls src={audioUrl} />
            <button className="btn danger" onClick={onDeleteAudio}>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <FiTrash2 /> Delete
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="table">
        <div className="row">
          <label className="label" htmlFor="companyName">Company Name</label>
          <input
            id="companyName"
            className="input"
            placeholder="Enter company name"
            value={fields.companyName || ''}
            onChange={(e) => handleChange('companyName', e.target.value)}
          />
        </div>

        <div className="row">
          <label className="label" htmlFor="contactPerson">Contact Person</label>
          <input
            id="contactPerson"
            className="input"
            placeholder="Enter contact person name"
            value={fields.contactPerson || ''}
            onChange={(e) => handleChange('contactPerson', e.target.value)}
          />
        </div>

        <div className="row">
          <label className="label" htmlFor="designation">Designation</label>
          <input
            id="designation"
            className="input"
            placeholder="Enter designation"
            value={fields.designation || ''}
            onChange={(e) => handleChange('designation', e.target.value)}
          />
        </div>

        <div className="row">
          <label className="label" htmlFor="mobile">Mobile</label>
          <input
            id="mobile"
            className="input"
            placeholder="Enter mobile number"
            value={fields.mobile || ''}
            onChange={(e) => handleChange('mobile', e.target.value)}
          />
        </div>

        <div className="row">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="Enter email address"
            value={fields.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>

        <div className="row">
          <label className="label" htmlFor="address">Address</label>
          <textarea
            id="address"
            className="input multiline"
            placeholder="Enter address"
            value={fields.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            rows={3}
          />
        </div>

        <div className="row">
          <label className="label" htmlFor="website">Website</label>
          <input
            id="website"
            type="url"
            className="input"
            placeholder="Enter website URL"
            value={fields.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
          />
        </div>

        <div className="row">
          <label className="label" htmlFor="typeOfVisitor">Type of Visitor</label>
          <select
            id="typeOfVisitor"
            className="input"
            value={fields.typeOfVisitor || ''}
            onChange={(e) => handleChange('typeOfVisitor', e.target.value)}
          >
            {TYPE_OF_VISITOR_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="row">
          <label className="label">Interested Products</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '100%' }}>
            {INTERESTED_PRODUCTS_OPTIONS.map(product => (
              <label key={product.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', wordWrap: 'break-word' }}>
                <input
                  type="checkbox"
                  checked={(fields.interestedProducts || []).includes(product.value)}
                  onChange={() => handleProductToggle(product.value)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0, color: '#364A63' }}
                />
                <span style={{ wordWrap: 'break-word', overflowWrap: 'break-word', color: '#364a63', fontSize: '9px' }}>{product.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="row">
          <label className="label" htmlFor="remarks">Remarks</label>
          <textarea
            id="remarks"
            className="input multiline"
            placeholder="Enter any remarks or notes"
            value={fields.remarks || ''}
            onChange={(e) => handleChange('remarks', e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <button
        className="primary"
        onClick={handleSave}
        disabled={loading.save || (activeExhibition && !isLive)}
      >
        {loading.save ? 'Saving...' : 'Save Card'}
      </button>
    </div>
  );
}
