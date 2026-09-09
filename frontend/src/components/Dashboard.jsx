import { useEffect, useMemo, useState } from 'react';
import { FiMic, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import { getCards, getCardsForExhibition, updateCard } from '../services/api.js';

const parseTimezoneOffsetMinutes = (timezone) => {
  const match = /^UTC([+-])(\d{2}):(\d{2})$/.exec(timezone || '');
  if (!match) return null;
  const [, sign, hours, minutes] = match;
  const baseMinutes = parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  return sign === '-' ? -baseMinutes : baseMinutes;
};

const formatInTimezone = (date, timezone) => {
  if (!date) return '—';
  const tzOffset = parseTimezoneOffsetMinutes(timezone);
  const d = new Date(date);

  if (tzOffset === null) return d.toLocaleString();

  // d.getTime() is UTC. Shift to target timezone.
  const targetMillis = d.getTime() + (tzOffset * 60000);
  const target = new Date(targetMillis);

  // Format using UTC methods to show the 'shifted' time as is
  return target.toLocaleString('en-US', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Function to check if the exhibition is active
const isExhibitionActive = (exhibition) => {
  if (!exhibition) return false;
  const now = new Date();
  const startTime = new Date(exhibition.startTime);
  const endTime = new Date(exhibition.endTime);
  // Add a 12-hour buffer to the end time
  endTime.setHours(endTime.getHours() + 12);
  return now >= startTime && now <= endTime;
};

export default function Dashboard({ activeExhibition }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [exhibitionEnded, setExhibitionEnded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingFields, setEditingFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [viewImage, setViewImage] = useState(null);

  useEffect(() => {
    if (activeExhibition) {
      const now = new Date();
      const endTime = new Date(activeExhibition.endTime);
      endTime.setHours(endTime.getHours() + 12);
      setExhibitionEnded(now > endTime);
    }
  }, [activeExhibition]);

  // Load cards function
  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        if (activeExhibition && activeExhibition._id) {
          const res = await getCardsForExhibition(activeExhibition._id);
          setCards(res?.data || []);
        } else {
          const res = await getCards();
          setCards(res?.data || []);
        }
        setError('');
      } catch (e) {
        setError(e.message || 'Failed to load cards');
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    loadCards();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadCards();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeExhibition]);

  const TYPE_OF_VISITOR_OPTIONS = [
    '',
    'ENDUSER',
    'DEALER',
    'CONSULTANT',
    'DOMESTIC',
    'INTERNATIONAL',
  ];

  const INTERESTED_PRODUCTS_OPTIONS = [
    'LAB GLASSWARE',
    'PLASTICWARE',
    'FILTERATION',
    'INSTRUMENTS',
    'HYDROMETERS',
    'THERMOMETERS',
  ];

  const getEditableSnapshot = (card) => {
    const snapshot = {};
    allFields.forEach((field) => {
      const value = card.fields?.[field] ?? card[field] ?? '';
      // Handle array fields
      if (field === 'interestedProducts') {
        snapshot[field] = Array.isArray(value) ? value : (value ? [value] : []);
      } else {
        snapshot[field] = value;
      }
    });
    return snapshot;
  };

  const handleEdit = (card) => {
    setEditingId(card._id);
    setEditingFields(getEditableSnapshot(card));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingFields({});
  };

  const handleFieldChange = (field, value) => {
    setEditingFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (cardId) => {
    try {
      setSaving(true);
      await updateCard(cardId, editingFields);
      setMessage({ type: 'success', text: 'Card updated successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setEditingId(null);
      setEditingFields({});
      // Reload cards
      const loadCards = async () => {
        try {
          if (activeExhibition && activeExhibition._id) {
            const res = await getCardsForExhibition(activeExhibition._id);
            setCards(res?.data || []);
          } else {
            const res = await getCards();
            setCards(res?.data || []);
          }
        } catch (e) {
          setError(e.message || 'Failed to load cards');
        }
      };
      await loadCards();
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to update card' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setSaving(false);
    }
  };

  const getFieldValue = (card, field) => {
    if (editingId === card._id) {
      return editingFields[field] ?? '';
    }
    const value = card.fields?.[field] || card[field] || '';
    if (field === 'interestedProducts') {
      return Array.isArray(value) ? value : value ? [value] : [];
    }
    return value;
  };

  const formatFieldLabel = (field) => {
    const labels = {
      companyName: 'COMPANY NAME',
      contactPerson: 'CONTACT PERSON',
      designation: 'DESIGNATION',
      mobile: 'MOBILE',
      email: 'EMAIL',
      address: 'ADDRESS',
      website: 'WEBSITE',
      typeOfVisitor: 'TYPE OF VISITOR',
      interestedProducts: 'INTERESTED PRODUCTS',
      remarks: 'REMARKS'
    };
    return labels[field] || field.toUpperCase();
  };

  const allFields = [
    'companyName',
    'contactPerson',
    'designation',
    'mobile',
    'email',
    'address',
    'website',
    'typeOfVisitor',
    'interestedProducts',
    'remarks'
  ];

  // Legacy fields for backward compatibility
  const legacyFields = ['name', 'phone', 'company'];

  const renderCardsCards = () => {
    if (cards.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <p>No cards found. Scan a card to get started!</p>
        </div>
      );
    }

    return (
      <div className="exhibitions-cards-container">
        {cards.map((card) => {
          const isEditing = editingId === card._id;
          return (
            <div key={card._id} className={`exhibition-card ${isEditing ? 'editing' : ''}`}>
              <div className="exhibition-card-details">
                <div className="exhibition-card-row">
                  <span className="exhibition-card-label">IMAGES</span>
                  <span className="exhibition-card-value">
                    {card.images && card.images.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxWidth: '100%' }}>
                        {card.images.slice(0, 5).map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Card ${idx + 1}`}
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setViewImage(img); }}
                          />
                        ))}
                      </div>
                    ) : card.image ? (
                      <img
                        src={card.image}
                        alt={card.contactPerson || card.name || 'card'}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, maxWidth: '100%', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setViewImage(card.image); }}
                      />
                    ) : (
                      <div style={{ width: '80px', height: '80px', background: 'var(--panel)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '12px', flexShrink: 0 }}>
                        No Image
                      </div>
                    )}
                  </span>
                </div>
                {allFields.map(field => {
                  const value = getFieldValue(card, field);
                  const isArrayField = field === 'interestedProducts';
                  const isVisitorField = field === 'typeOfVisitor';
                  return (
                    <div key={field} className="exhibition-card-row">
                      <span className="exhibition-card-label">{formatFieldLabel(field)}</span>
                      <span className="exhibition-card-value">
                        {isEditing ? (
                          isArrayField ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {INTERESTED_PRODUCTS_OPTIONS.map(product => (
                                <label key={product} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                  <input
                                    type="checkbox"
                                    checked={(editingFields[field] || []).includes(product)}
                                    onChange={(e) => {
                                      const current = editingFields[field] || [];
                                      const updated = e.target.checked
                                        ? [...current, product]
                                        : current.filter(p => p !== product);
                                      handleFieldChange(field, updated);
                                    }}
                                  />
                                  {product}
                                </label>
                              ))}
                            </div>
                          ) : isVisitorField ? (
                            <select
                              className="input"
                              value={editingFields[field] || ''}
                              onChange={(e) => handleFieldChange(field, e.target.value)}
                              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                            >
                              {TYPE_OF_VISITOR_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                  {option || 'Select Type'}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field === 'email' ? 'email' : field === 'website' ? 'url' : 'text'}
                              className="input"
                              value={editingFields[field] ?? value}
                              onChange={(e) => handleFieldChange(field, e.target.value)}
                              style={{ width: '100%', maxWidth: '100%', padding: '8px', boxSizing: 'border-box' }}
                              placeholder={`Enter ${formatFieldLabel(field)}`}
                            />
                          )
                        ) : (
                          <span>
                            {isArrayField ? (value?.length ? value.join(', ') : '—') : (value || '—')}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
                <div className="exhibition-card-row">
                  <span className="exhibition-card-label">DATE</span>
                  <span className="exhibition-card-value">{formatInTimezone(card.createdAt, activeExhibition?.timezone)}</span>
                </div>
                <div className="exhibition-card-row">
                  <span className="exhibition-card-label">AUDIO</span>
                  <span className="exhibition-card-value">
                    {card.audio ? (
                      <span className="pill pill-rec" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <FiMic /> REC
                      </span>
                    ) : (
                      <span className="pill pill-muted">No REC</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="exhibition-card-actions">
                <div className="exhibition-card-actions-label">ACTIONS</div>
                <div className="exhibition-card-actions-buttons">
                  {isEditing ? (
                    <>
                      <button
                        className="btn btn-view"
                        onClick={() => handleSave(card._id)}
                        disabled={saving}
                      >
                        <FiSave /> {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="btn btn-delete"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        <FiX /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-view"
                        onClick={(e) => { e.stopPropagation(); handleEdit(card); }}
                      >
                        <FiEdit2 /> Edit
                      </button>
                      <button
                        className="btn btn-duplicate"
                        onClick={(e) => { e.stopPropagation(); setSelected(card); }}
                      >
                        View
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="dash">
      <div className="dash-header">
        <h2 style={{ wordWrap: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>Dashboard-{activeExhibition?.name}</h2>
        <p className="muted" style={{ wordWrap: 'break-word', maxWidth: '100%' }}>All saved cards - Click Edit to modify details</p>
      </div>
      {exhibitionEnded && (
        <div className="msg info">
          The exhibition has ended. You can still view and edit the cards, but you cannot add new ones.
        </div>
      )}
      {message.text && <div className={`msg ${message.type}`}>{message.text}</div>}
      {loading && <div className="loader" aria-busy="true" />}
      {error && <div className="msg error">{error}</div>}

      {cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <p>No cards found. Scan a card to get started!</p>
        </div>
      ) : (
        <>
          <div className="exhibitions-desktop">
            <div className="exhibitions-panel table table-scroll" style={{ padding: 0, marginTop: '20px' }}>
              <table className="exhibitions-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Images</th>
                    {allFields.map(field => (
                      <th key={field} style={{ textAlign: 'left', padding: '12px 16px', textTransform: 'capitalize' }}>
                        {formatFieldLabel(field)}
                      </th>
                    ))}
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Audio</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => {
                    const isEditing = editingId === card._id;
                    return (
                      <tr
                        key={card._id}
                        className={isEditing ? 'editing' : ''}
                        onClick={(e) => {
                          if (isEditing) return;
                          if (e.target.closest('.action-cell')) return;
                          setSelected(card);
                        }}
                        style={{ cursor: isEditing ? 'default' : 'pointer' }}
                      >
                        <td style={{ padding: '16px', minWidth: '100px' }}>
                          {card.images && card.images.length > 0 ? (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '180px' }}>
                              {card.images.slice(0, 3).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`Card ${idx + 1}`}
                                  style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, cursor: 'pointer' }}
                                  onClick={(e) => { e.stopPropagation(); setViewImage(img); }}
                                />
                              ))}
                              {card.images.length > 3 && (
                                <div style={{ width: '50px', height: '50px', background: 'var(--panel)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '10px', flexShrink: 0 }}>
                                  +{card.images.length - 3}
                                </div>
                              )}
                            </div>
                          ) : card.image ? (
                            <img
                              src={card.image}
                              alt={card.contactPerson || card.name || 'card'}
                              style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', maxWidth: '100%', cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); setViewImage(card.image); }}
                            />
                          ) : (
                            <div style={{ width: '60px', height: '60px', background: 'var(--panel)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                              No Image
                            </div>
                          )}
                        </td>
                        {allFields.map(field => {
                          const value = getFieldValue(card, field);
                          const isArrayField = field === 'interestedProducts';
                          const isVisitorField = field === 'typeOfVisitor';
                          return (
                            <td key={field} style={{ padding: '16px' }}>
                              {isEditing ? (
                                isArrayField ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
                                    {INTERESTED_PRODUCTS_OPTIONS.map(product => (
                                      <label key={product} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                        <input
                                          type="checkbox"
                                          checked={(editingFields[field] || []).includes(product)}
                                          onChange={(e) => {
                                            const current = editingFields[field] || [];
                                            const updated = e.target.checked
                                              ? [...current, product]
                                              : current.filter(p => p !== product);
                                            handleFieldChange(field, updated);
                                          }}
                                        />
                                        {product}
                                      </label>
                                    ))}
                                  </div>
                                ) : isVisitorField ? (
                                  <select
                                    className="input"
                                    value={editingFields[field] || ''}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    style={{ width: '100%', minWidth: '150px', maxWidth: '100%', boxSizing: 'border-box' }}
                                  >
                                    {TYPE_OF_VISITOR_OPTIONS.map(option => (
                                      <option key={option} value={option}>
                                        {option || 'Select Type'}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={field === 'email' ? 'email' : field === 'website' ? 'url' : 'text'}
                                    className="input"
                                    value={editingFields[field] ?? value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    style={{ width: '100%', minWidth: '150px', maxWidth: '100%', padding: '8px', boxSizing: 'border-box' }}
                                    placeholder={`Enter ${formatFieldLabel(field)}`}
                                  />
                                )
                              ) : (
                                <span>
                                  {isArrayField ? (value?.length ? value.join(', ') : '—') : (value || '—')}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: '16px' }}>
                          {formatInTimezone(card.createdAt, activeExhibition?.timezone)}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {card.audio ? (
                            <span className="pill pill-rec" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                              <FiMic /> REC
                            </span>
                          ) : (
                            <span className="pill pill-muted">No REC</span>
                          )}
                        </td>
                        <td className="action-cell" style={{ padding: '16px', textAlign: 'right' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn"
                                onClick={() => handleSave(card._id)}
                                disabled={saving}
                                style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.2))', borderColor: '#22c55e' }}
                              >
                                <FiSave /> {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                className="btn danger"
                                onClick={handleCancelEdit}
                                disabled={saving}
                              >
                                <FiX /> Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                className="btn"
                                onClick={(e) => { e.stopPropagation(); handleEdit(card); }}
                                style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(244,114,182,0.2))' }}
                              >
                                <FiEdit2 /> Edit
                              </button>
                              <button
                                className="btn"
                                onClick={(e) => { e.stopPropagation(); setSelected(card); }}
                              >
                                View
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="exhibitions-mobile">{renderCardsCards()}</div>
        </>
      )}

      {selected && (
        <DetailModal card={selected} onClose={() => setSelected(null)} onViewImage={setViewImage} activeExhibition={activeExhibition} />)
      }

      {viewImage && (
        <ImageModal src={viewImage} onClose={() => setViewImage(null)} />
      )}
    </div>
  );
}

function DetailModal({ card, onClose, onViewImage, activeExhibition }) {
  const created = useMemo(() => formatInTimezone(card.createdAt, activeExhibition?.timezone), [card.createdAt, activeExhibition?.timezone]);
  const displayName = card.contactPerson || card.name || card.companyName || 'Unnamed';

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Card details" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h3 style={{ wordWrap: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>{displayName}</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">
          <div className="modal-media">
            {card.images && card.images.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
                {card.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Card ${idx + 1}`}
                    style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', height: 'auto', cursor: 'pointer' }}
                    onClick={() => onViewImage(img)}
                  />
                ))}
              </div>
            ) : card.image ? (
              <img
                src={card.image}
                alt={displayName}
                style={{ maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
                onClick={() => onViewImage(card.image)}
              />
            ) : (
              <div className="ph">No Image</div>
            )}
          </div>
          <div className="modal-meta" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            <div><strong>Date:</strong> {created}</div>
            {card.companyName && <div><strong>Company Name:</strong> {card.companyName}</div>}
            {card.contactPerson && <div><strong>Contact Person:</strong> {card.contactPerson}</div>}
            {card.designation && <div><strong>Designation:</strong> {card.designation}</div>}
            {card.mobile && <div><strong>Mobile:</strong> {card.mobile}</div>}
            {card.email && <div><strong>Email:</strong> {card.email}</div>}
            {card.address && <div><strong>Address:</strong> {card.address}</div>}
            {card.website && (
              <div>
                <strong>Website:</strong>{' '}
                <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`}
                  target="_blank"
                  rel="noopener noreferrer">
                  {card.website}
                </a>
              </div>
            )}
            {card.typeOfVisitor && <div><strong>Type of Visitor:</strong> {card.typeOfVisitor}</div>}
            {card.interestedProducts && card.interestedProducts.length > 0 && (
              <div><strong>Interested Products:</strong> {card.interestedProducts.join(', ')}</div>
            )}
            {card.remarks && <div><strong>Remarks:</strong> {card.remarks}</div>}
            {/* Legacy fields for backward compatibility */}
            {!card.companyName && card.company && <div><strong>Company:</strong> {card.company}</div>}
            {!card.contactPerson && card.name && <div><strong>Name:</strong> {card.name}</div>}
            {!card.mobile && card.phone && <div><strong>Phone:</strong> {card.phone}</div>}
            {card.audio ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="pill pill-rec"><FiMic /> REC</span>
                  <span>Audio recording</span>
                </div>
                <audio controls src={card.audio} style={{ width: '100%' }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageModal({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="modal" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        style={{ position: 'relative', width: 'auto', height: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: -50,
            right: 0,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1110
          }}
        >
          <FiX size={24} />
        </button>
        <img
          src={src}
          alt="Full size"
          style={{
            maxWidth: '95vw',
            maxHeight: '90vh',
            objectFit: 'contain',
            borderRadius: '8px',
            display: 'block',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}
        />
      </div>
    </div>
  );
}
