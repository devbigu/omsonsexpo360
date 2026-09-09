import React from 'react';
import { useNavigate } from 'react-router-dom';

const AccessDenied = () => {
  const navigate = useNavigate();
  return (
    <div className="container" style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center' }}>
      <div style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.1), rgba(220,38,38,0.1))', border: '2px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '48px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</h1>
        <h2 style={{ marginBottom: '16px' }}>Access Denied</h2>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: '1.6' }}>
          You do not have access to this website yet. Your IP address has been sent to the administrator for approval.
          <br /><br />
          Please wait for admin approval. You will be automatically redirected to the home page once your access is granted.
        </p>
        <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--muted)' }}>
          Checking for access approval...
        </div>
        <button 
          className="btn" 
          onClick={() => {
            localStorage.removeItem('token');
            navigate('/login');
          }}
          style={{ marginTop: '24px' }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;

