import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminLogin } from '../services/api';

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await adminLogin(email, password);
      localStorage.setItem('adminToken', res.token);
      onLogin(res.token);
    } catch (error) {
      console.error(error);
      setError(error.message || 'Invalid admin credentials');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '500px', margin: '40px auto' }}>
      <div style={{ background: 'linear-gradient(180deg, rgba(96,165,250,0.1), rgba(244,114,182,0.1))', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '16px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.jpg" alt="Logo" style={{ maxHeight: '60px' }} />
        </div>
        <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="msg error" style={{ marginBottom: '16px' }}>{error}</div>}
          <div className="table">
            <div className="row">
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                required
              />
            </div>
            <div className="row">
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>
          </div>
          <button type="submit" className="primary">Login</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)' }}>
          <Link to="/login" style={{ color: '#60a5fa' }}>User Login</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;