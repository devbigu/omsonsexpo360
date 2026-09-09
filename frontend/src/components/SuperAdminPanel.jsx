
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiX, FiLogOut, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import {
    getIpRequests,
    approveIpRequest,
    getAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin
} from '../services/api';
import countries from '../countries.json';

export default function SuperAdminPanel() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ip-requests'); // 'ip-requests', 'admins'
    const [ipRequests, setIpRequests] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Admin Modal State
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', designation: '', phoneNumber: '' });

    const loadIpRequests = async () => {
        try {
            const res = await getIpRequests();
            setIpRequests(res?.data || []);
            setError('');
        } catch (e) {
            setError(e.message || 'Failed to load IP requests');
        }
    };

    const loadAdmins = async () => {
        try {
            const res = await getAdmins();
            setAdmins(res?.data || []);
            setError('');
        } catch (e) {
            setError(e.message || 'Failed to load admins');
        }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([loadIpRequests(), loadAdmins()]);
            setLoading(false);
        })();
    }, []);

    // Auto-refresh IP requests every 10 seconds only when on IP requests tab
    useEffect(() => {
        if (activeTab === 'ip-requests') {
            const interval = setInterval(() => {
                loadIpRequests();
            }, 10000); // 10 seconds
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'admins') {
            loadAdmins();
        }
    }, [activeTab]);

    const handleApprove = async (requestId, approved) => {
        try {
            await approveIpRequest(requestId, approved);
            setMessage({ type: 'success', text: `IP request ${approved ? 'approved' : 'rejected'}` });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            await loadIpRequests();
        } catch (e) {
            setMessage({ type: 'error', text: e.message || 'Failed to update request' });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        }
    };

    const handleDeleteAdmin = async (id) => {
        try {
            await deleteAdmin(id);
            setMessage({ type: 'success', text: 'Admin deleted successfully' });
            loadAdmins();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (e) {
            setMessage({ type: 'error', text: e.message || 'Failed to delete admin' });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        }
    };

    const getCountryFlag = (countryCode) => {
        if (!countryCode) return null;
        const country = countries.find(c => c.code === countryCode);
        return country ? country.flag : null;
    };

    const getCountryName = (countryCode) => {
        if (!countryCode) return 'Unknown';
        const country = countries.find(c => c.code === countryCode);
        return country ? country.name : countryCode;
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('superAdmin'); // Clear the super admin flag
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '40px' }}>
                <div className="loader" />
            </div>
        );
    }

    const pendingCount = ipRequests.filter(r => !r.approved).length;

    return (
        <div className="admin-page">
            <div className="admin-hero">
                <div>
                    <h1 className="admin-title">Super Admin Panel</h1>
                    <p className="muted" style={{ color: 'rgba(255,255,255,0.8)' }}>Manage IP Approvals and Admin Users</p>
                </div>
                <button className="btn danger" onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid red' }}>
                    <FiLogOut style={{ marginRight: '8px' }} />
                    Logout
                </button>
            </div>

            <div className="admin-tabs">
                <button
                    className={`btn admin-tab ${activeTab === 'ip-requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ip-requests')}
                >
                    IP Requests
                    {pendingCount > 0 && (
                        <span className="admin-badge">{pendingCount}</span>
                    )}
                </button>
                <button
                    className={`btn admin-tab ${activeTab === 'admins' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admins')}
                >
                    Manage Admins
                </button>
            </div>

            {message.text && <div className={`msg ${message.type}`}>{message.text}</div>}
            {error && <div className="msg error">{error}</div>}

            {activeTab === 'ip-requests' && (
                <div>
                    <div className="admin-section-head">
                        <h2>IP Approval Requests</h2>
                        <div className="admin-stats">
                            <div className="admin-stat danger">
                                <span>Pending</span>
                                <strong>{pendingCount}</strong>
                            </div>
                            <div className="admin-stat success">
                                <span>Approved</span>
                                <strong>{ipRequests.filter(r => r.approved).length}</strong>
                            </div>
                        </div>
                    </div>
                    {ipRequests.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 40px',
                            color: 'var(--muted)',
                            background: 'linear-gradient(180deg, rgba(96,165,250,0.05), rgba(244,114,182,0.05))',
                            borderRadius: '16px',
                            border: '1px dashed rgba(96,165,250,0.3)'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                            <p style={{ fontSize: '18px', margin: 0 }}>No IP requests found</p>
                        </div>
                    ) : (
                        <div className="exhibitions-panel table table-scroll admin-table-wrapper">
                            <table className="exhibitions-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px 16px' }}>Name</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px' }}>Email</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px' }}>IP Address</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px' }}>Country</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px' }}>Status</th>
                                        <th style={{ textAlign: 'left', padding: '12px 16px' }}>Date</th>
                                        <th style={{ textAlign: 'right', padding: '12px 16px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ipRequests
                                        .sort((a, b) => {
                                            // Pending requests first
                                            if (a.approved !== b.approved) {
                                                return a.approved ? 1 : -1;
                                            }
                                            // Then by date (newest first)
                                            return new Date(b.createdAt) - new Date(a.createdAt);
                                        })
                                        .map((request) => {
                                            const isApproved = request.approved === true;
                                            return (
                                                <tr
                                                    key={request._id}
                                                    style={{
                                                        background: !isApproved ? 'rgba(239,68,68,0.05)' : 'transparent',
                                                        borderLeft: !isApproved ? '4px solid #ef4444' : '4px solid transparent'
                                                    }}
                                                >
                                                    <td style={{ padding: '16px', fontWeight: '600' }}>{request.userName || '—'}</td>
                                                    <td style={{ padding: '16px' }}>{request.userEmail || '—'}</td>
                                                    <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '14px' }}>{request.ipAddress || '—'}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {getCountryFlag(request.countryCode) && (
                                                                <span style={{ fontSize: '24px' }}>{getCountryFlag(request.countryCode)}</span>
                                                            )}
                                                            <span>{getCountryName(request.countryCode)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span className={`pill ${isApproved ? 'pill-live' : 'pill-muted'}`}>
                                                            {isApproved ? '✓ Approved' : '⏳ Pending'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--muted)' }}>
                                                        {new Date(request.createdAt).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                                        {!isApproved ? (
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    className="btn"
                                                                    onClick={() => handleApprove(request._id, true)}
                                                                    style={{
                                                                        background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,163,74,0.25))',
                                                                        borderColor: '#22c55e',
                                                                        color: '#22c55e',
                                                                        fontWeight: '600'
                                                                    }}
                                                                >
                                                                    <FiCheck style={{ marginRight: '6px' }} />
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    className="btn danger"
                                                                    onClick={() => handleApprove(request._id, false)}
                                                                    style={{ fontWeight: '600' }}
                                                                >
                                                                    <FiX style={{ marginRight: '6px' }} />
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                                                                Approved {request.approvedAt ? new Date(request.approvedAt).toLocaleDateString() : ''}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'admins' && (
                <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0 }}>Manage Admins</h2>
                        <button
                            className="btn"
                            onClick={() => {
                                setEditingAdmin(null);
                                setAdminForm({ name: '', email: '', password: '', designation: '', phoneNumber: '' });
                                setShowAdminModal(true);
                            }}
                            style={{
                                background: 'linear-gradient(135deg, #60a5fa, #c084fc)',
                                color: 'white',
                                border: 'none'
                            }}
                        >
                            <FiPlus style={{ marginRight: '8px' }} />
                            Add Admin
                        </button>
                    </div>

                    <div className="exhibitions-panel table table-scroll admin-table-wrapper">
                        <table className="exhibitions-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Name</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Email</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Designation</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Mobile</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Created Date</th>
                                    <th style={{ textAlign: 'right', padding: '12px 16px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map((admin) => (
                                    <tr key={admin._id}>
                                        <td style={{ padding: '16px', fontWeight: '600' }}>{admin.name}</td>
                                        <td style={{ padding: '16px' }}>{admin.email}</td>
                                        <td style={{ padding: '16px' }}>{admin.designation || '—'}</td>
                                        <td style={{ padding: '16px' }}>{admin.phoneNumber || '—'}</td>
                                        <td style={{ padding: '16px', color: 'var(--muted)' }}>
                                            {new Date(admin.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn"
                                                    onClick={() => {
                                                        setEditingAdmin(admin);
                                                        setAdminForm({
                                                            name: admin.name,
                                                            email: admin.email,
                                                            password: '',
                                                            designation: admin.designation || '',
                                                            phoneNumber: admin.phoneNumber || ''
                                                        });
                                                        setShowAdminModal(true);
                                                    }}
                                                    style={{ padding: '6px' }}
                                                    title="Edit"
                                                >
                                                    <FiEdit2 />
                                                </button>
                                                <button
                                                    className="btn danger"
                                                    onClick={() => {
                                                        if (admin.email === 'superadmin@bizcard.com') {
                                                            alert('Cannot delete super admin');
                                                            return;
                                                        }
                                                        if (window.confirm('Are you sure you want to delete this admin?')) {
                                                            handleDeleteAdmin(admin._id);
                                                        }
                                                    }}
                                                    style={{ padding: '6px' }}
                                                    title="Delete"
                                                    disabled={admin.email === 'superadmin@bizcard.com'}
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Admin Modal */}
                    {showAdminModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}>
                            <div style={{
                                background: 'white',
                                padding: '24px',
                                borderRadius: '16px',
                                width: '100%',
                                maxWidth: '400px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                            }}>
                                <h2 style={{ marginTop: 0, color: 'navy' }}>{editingAdmin ? 'Edit Admin' : 'Add Admin'}</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'navy' }}>Name</label>
                                        <input
                                            className="input"
                                            value={adminForm.name}
                                            onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'navy' }}>Designation</label>
                                        <input
                                            className="input"
                                            value={adminForm.designation}
                                            onChange={e => setAdminForm({ ...adminForm, designation: e.target.value })}
                                            placeholder="e.g. Project Manager"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'navy' }}>Phone Number</label>
                                        <input
                                            className="input"
                                            value={adminForm.phoneNumber}
                                            onChange={e => setAdminForm({ ...adminForm, phoneNumber: e.target.value })}
                                            placeholder="e.g. +91 98765 43210"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'navy' }}>Email</label>
                                        <input
                                            className="input"
                                            value={adminForm.email}
                                            onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                                            placeholder="admin@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'navy' }}>
                                            {editingAdmin ? 'New Password (optional)' : 'Password'}
                                        </label>
                                        <input
                                            className="input"
                                            type="password"
                                            value={adminForm.password}
                                            onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                                            placeholder={editingAdmin ? 'Leave blank to keep current' : 'Secure password'}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                        <button
                                            className="btn primary"
                                            style={{ flex: 1, background: 'navy', color: 'white' }}
                                            onClick={async () => {
                                                try {
                                                    if (editingAdmin) {
                                                        await updateAdmin(editingAdmin._id, adminForm);
                                                        setMessage({ type: 'success', text: 'Admin updated successfully' });
                                                    } else {
                                                        await createAdmin(adminForm);
                                                        setMessage({ type: 'success', text: 'Admin created successfully' });
                                                    }
                                                    setShowAdminModal(false);
                                                    loadAdmins();
                                                    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                                                } catch (e) {
                                                    alert(e.message);
                                                }
                                            }}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className="btn"
                                            style={{ flex: 1, background: '#f3f4f6' }}
                                            onClick={() => setShowAdminModal(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
