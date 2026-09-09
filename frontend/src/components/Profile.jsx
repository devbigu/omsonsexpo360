import { useEffect, useState, useMemo } from 'react';
import { listExhibitions, getLiveExhibitions, getAdminProfile, updateAdminProfile } from '../services/api.js';
import countries from '../countries.json';
import { FiCheck, FiAlertCircle, FiEdit2, FiSave, FiX } from 'react-icons/fi';

export default function Profile({ userName }) {
  const [exhibitions, setExhibitions] = useState([]);
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = !!localStorage.getItem('adminToken');

  // Admin Profile State
  const [adminProfile, setAdminProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const loadExhibitions = async () => {
    try {
      const res = await listExhibitions();
      const allExhibitions = res?.data || [];
      const userExhibitions = allExhibitions.filter(ex => ex.createdBy === userName);
      setExhibitions(userExhibitions);
    } catch (e) {
      setError(e.message || 'Failed to load exhibitions');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      (async () => {
        setLoading(true);
        try {
          const res = await getAdminProfile();
          if (res.success) {
            setAdminProfile(res.data);
            setFormData({
              name: res.data.name || '',
              email: res.data.email || '',
              password: ''
            });
          }
        } catch (e) {
          setError(e.message || 'Failed to load admin profile');
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    (async () => {
      setLoading(true);
      await loadExhibitions();
      try {
        const l = await getLiveExhibitions();
        setLive(l?.data || []);
      } catch (e) {
        // silent
      }
      setLoading(false);
    })();
  }, [userName, isAdmin]);

  const sortedExhibitions = useMemo(() => {
    return [...exhibitions].sort((a, b) => {
      const aIsLive = live.find((l) => l._id === a._id) != null;
      const bIsLive = live.find((l) => l._id === b._id) != null;
      if (aIsLive && !bIsLive) return -1;
      if (!aIsLive && bIsLive) return 1;
      return new Date(a.startTime) - new Date(b.startTime);
    });
  }, [exhibitions, live]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const updateData = {
        name: formData.name,
        email: formData.email
      };
      if (formData.password) {
        updateData.password = formData.password;
      }

      const res = await updateAdminProfile(updateData);
      if (res.success) {
        setSuccessMessage('Profile updated successfully');
        setAdminProfile(res.data);
        setFormData({
          name: res.data.name,
          email: res.data.email,
          password: ''
        });
        setIsEditing(false);
      }
    } catch (e) {
      setError(e.message || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccessMessage('');
    // Reset form to current profile
    if (adminProfile) {
      setFormData({
        name: adminProfile.name || '',
        email: adminProfile.email || '',
        password: ''
      });
    }
  };

  // Styles for Outlined Input
  const inputGroupStyle = {
    position: 'relative',
    marginBottom: '24px'
  };

  const labelStyle = {
    position: 'absolute',
    top: '-10px',
    left: '12px',
    backgroundColor: '#fff',
    padding: '0 6px',
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
    pointerEvents: 'none'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#1f2937',
    backgroundColor: isEditing ? '#fff' : '#f9fafb' // Light gray when read-only
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loader" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="dash" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '40px', minHeight: '90vh' }}>
        <div className="profile-card" style={{ width: '100%', maxWidth: '480px', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '24px', fontWeight: '700', color: '#111827' }}>
            Profile Details
          </h2>

          {successMessage && (
            <div style={{
              background: '#ecfdf5',
              color: '#047857',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              <FiCheck size={16} /> {successMessage}
            </div>
          )}

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleUpdate}>
            {/* Name Field */}
            <div style={inputGroupStyle}>
              <label style={{ ...labelStyle, color: '#6366f1' }}>Name</label>
              <input
                style={{ ...inputStyle, borderColor: isEditing ? '#6366f1' : '#e5e7eb' }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your Name"
                readOnly={!isEditing}
              />
            </div>

            {/* Email Field */}
            <div style={inputGroupStyle}>
              <label style={{ ...labelStyle, color: '#6366f1' }}>E-mail</label>
              <input
                style={{ ...inputStyle, borderColor: isEditing ? '#6366f1' : '#e5e7eb' }}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                type="email"
                readOnly={!isEditing}
              />
            </div>

            {/* Password Field */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password</label>
              <input
                style={{ ...inputStyle, borderColor: isEditing ? '#d1d5db' : '#e5e7eb' }} // Neutral border unless active
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isEditing ? "New Password (optional)" : "••••••••"}
                type="password"
                readOnly={!isEditing}
              />
            </div>

            <div style={{ marginTop: '32px' }}>
              {!isEditing ? (
                <button
                  type="button"
                  className="btn primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                  onClick={() => setIsEditing(true)}
                >
                  <FiEdit2 style={{ marginRight: '8px' }} /> Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="submit"
                    className="btn"
                    style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                  >
                    <FiSave style={{ marginRight: '5px', width: '16px', height: '16px' }} />Save
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                    onClick={handleCancel}
                  >
                    <FiX style={{ marginRight: '5px', width: '16px', height: '16px' }} />Cancel
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h2>My Profile</h2>
          <p className="muted">Exhibitions created by {userName}</p>
        </div>
      </div>

      {error && <div className="msg error">{error}</div>}

      {sortedExhibitions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 40px',
          color: 'var(--muted)',
          background: 'linear-gradient(180deg, rgba(96,165,250,0.05), rgba(244,114,182,0.05))',
          borderRadius: '16px',
          border: '1px dashed rgba(96,165,250,0.3)',
          marginTop: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ fontSize: '18px', margin: 0 }}>No exhibitions created yet</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>Create your first exhibition to get started</p>
        </div>
      ) : (
        <div className="exhibitions-panel table" style={{ padding: 0, marginTop: '20px' }}>
          <table className="exhibitions-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Start Time</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>End Time</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Timezone</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Country</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedExhibitions.map((ex) => {
                const isLive = live.find((l) => l._id === ex._id) != null;
                const now = new Date();
                const startTime = new Date(ex.startTime);
                const endTime = new Date(ex.endTime);
                endTime.setHours(endTime.getHours() + 12);
                const isUpcoming = startTime > now && !isLive;
                const isCompleted = endTime < now && !isLive;
                const country = countries.find(c => c.code === ex.country);

                return (
                  <tr key={ex._id}>
                    <td style={{ padding: '16px', fontWeight: '600' }}>{ex.name}</td>
                    <td style={{ padding: '16px' }}>{new Date(ex.startTime).toLocaleString()}</td>
                    <td style={{ padding: '16px' }}>{new Date(ex.endTime).toLocaleString()}</td>
                    <td style={{ padding: '16px' }}>{ex.timezone}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {country && <span style={{ fontSize: '20px' }}>{country.flag}</span>}
                        <span>{country ? country.name : ex.country}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className={`pill ${isLive ? 'pill-live' : isUpcoming ? 'pill-upcoming' : 'pill-completed'}`}>
                        {isLive ? 'Live' : isUpcoming ? 'Upcoming' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
