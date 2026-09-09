import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiTrash2, FiEdit2, FiPlus, FiLogOut, FiUser, FiSearch } from 'react-icons/fi';
import {
  listExhibitions,
  getLiveExhibitions,
  exportAllExhibitions,
  exportExhibitionCards,
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from '../services/api';
import countries from '../countries.json';

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

  const targetMillis = d.getTime() + (tzOffset * 60000);
  const target = new Date(targetMillis);

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

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('exhibitions');
  const [exhibitions, setExhibitions] = useState([]);
  const [users, setUsers] = useState([]);
  const [live, setLive] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', designation: '', phoneNumber: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadExhibitions = async () => {
    try {
      const res = await listExhibitions();
      setExhibitions(res?.data || []);
      try {
        const l = await getLiveExhibitions();
        setLive(l?.data || []);
      } catch (e) {
        // silent
      }
    } catch (e) {
      setError(e.message || 'Failed to load exhibitions');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    }
  };

  const filteredExhibitions = exhibitions.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.locationType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.venue?.toLowerCase().includes(searchTerm.toLowerCase());

    const now = new Date();
    const startTime = new Date(ex.startTime);
    const endTime = new Date(ex.endTime);
    endTime.setHours(endTime.getHours() + 12);
    const isLive = live.find((l) => l._id === ex._id) != null;
    const isUpcoming = startTime > now && !isLive;
    const isCompleted = endTime < now && !isLive;

    if (activeFilter === 'All') return matchesSearch;
    if (activeFilter === 'Live') return matchesSearch && isLive;
    if (activeFilter === 'Upcoming') return matchesSearch && isUpcoming;
    if (activeFilter === 'Completed') return matchesSearch && isCompleted;
    return matchesSearch;
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadExhibitions();
      await loadUsers();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'exhibitions') {
      loadExhibitions();
      const interval = setInterval(() => {
        loadExhibitions();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const getStatusInfo = (ex) => {
    const isLive = live.find((l) => l._id === ex._id) != null;
    const now = new Date();
    const startTime = new Date(ex.startTime);
    const endTime = new Date(ex.endTime);
    endTime.setHours(endTime.getHours() + 12);
    const isUpcoming = startTime > now && !isLive;
    const isCompleted = endTime < now && !isLive;

    if (isLive) return { status: 'Live', color: 'bg-green-100 text-green-700' };
    if (isUpcoming) return { status: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    if (isCompleted) return { status: 'Completed', color: 'bg-green-400 text-gray-50' };
    return { status: 'Pending', color: 'bg-gray-100 text-gray-700' };
  };

  const handleExportAll = async () => {
    try {
      const blob = await exportAllExhibitions();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exhibitions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setMessage({ type: 'success', text: 'Exhibitions exported successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to export exhibitions' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleExportCards = async (ex) => {
    try {
      const blob = await exportExhibitionCards(ex._id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cards-${ex.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setMessage({ type: 'success', text: 'Cards exported successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to export cards' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await deleteUser(id);
      setMessage({ type: 'success', text: 'User deleted successfully' });
      loadUsers();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to delete user' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8  lg:mt-30 ">
      <div className="bg-white -mt-16 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className='flex justify-between'>
            <div className="mb-6 bg-blue-600 py-1 px-2 rounded-xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Admin Panel</h1>
            
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 h-auto text-red-600 hover:text-red-700 hover:bg-red-200 rounded-2xl font-semibold mb-6 transition px-7"
          >
            <FiLogOut size={28} />
           Logout
          </button>
          </div>

          <div className="border-t border-gray-200 my-6"></div>

          <div className="flex flex-rows sm:flex-row gap-3 mb-6">
            <button
              onClick={() => setActiveTab('exhibitions')}
              className={`flex-1 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ease-out ${
                activeTab === 'exhibitions'
                  ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Export Exhibitions
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ease-out ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('exhibitions')}
              className="flex-1 px-6 py-3 rounded-2xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              View Exhibitions
            </button>
          </div>

          {activeTab === 'exhibitions' && (
            <div className="flex justify-end">
              <button
                onClick={handleExportAll}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition inline-flex items-center gap-2 w-full text-center justify-center mx-2"
              >
                <FiDownload size={18} />
                Export All Exhibitions
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {message.text}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {/* Exhibitions View */}
        {activeTab === 'exhibitions' && (
          <div key="exhibitions" className="space-y-6 animate-tab">
            {/* Search Bar */}
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Search exhibitions by name, country, location type, or venue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition bg-white"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['All', 'Live', 'Upcoming', 'Completed'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition ${
                    activeFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Exhibitions Cards */}
            {filteredExhibitions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500 text-lg">No exhibitions found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExhibitions.map((ex) => {
                  const statusInfo = getStatusInfo(ex);
                  const country = countries.find(c => c.code === ex.country);

                  return (
                    <div
                      key={ex._id}
                      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition"
                    >
                      {/* Header with Status */}
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-sm lg:text-base mb-1">{ex.name}</h3>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                            {statusInfo.status}
                          </span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-3 mb-6 text-sm">
                        {/* Start Time */}
                        <div className="border-b border-gray-100 pb-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Start Time</p>
                          <p className="text-gray-900 font-medium">{formatInTimezone(ex.startTime, ex.timezone)}</p>
                        </div>

                        {/* End Time */}
                        <div className="border-b border-gray-100 pb-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">End Time</p>
                          <p className="text-gray-900 font-medium">{formatInTimezone(ex.endTime, ex.timezone)}</p>
                        </div>

                        {/* Timezone */}
                        <div className="border-b border-gray-100 pb-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Timezone</p>
                          <p className="text-gray-900 font-medium">{ex.timezone || '—'}</p>
                        </div>

                        {/* Country */}
                        <div className="border-b border-gray-100 pb-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Country</p>
                          <p className="text-gray-900 font-medium">{country?.flag} {country?.name || ex.country}</p>
                        </div>

                        {/* Created By */}
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Created By</p>
                          <p className="text-gray-900 font-medium">{ex.createdBy || '—'}</p>
                        </div>
                      </div>

                      {/* Export Action */}
                      <button
                        onClick={() => handleExportCards(ex)}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <FiDownload size={16} />
                        Export Cards
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Users View */}
        {activeTab === 'users' && (
          <div key="users" className="space-y-6 animate-tab">
            {/* Add User Button */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setUserForm({ name: '', email: '', password: '', designation: '', phoneNumber: '' });
                  setShowUserModal(true);
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center gap-2"
              >
                <FiPlus size={18} />
                Add User
              </button>
            </div>

            {/* Users List */}
            {users.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500 text-lg">No users found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1 w-full">
                        <h3 className="font-bold text-gray-900 mb-3">{user.name}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Email</p>
                            <p className="text-gray-900">{user.email}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Designation</p>
                            <p className="text-gray-900">{user.designation || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Mobile</p>
                            <p className="text-gray-900">{user.phoneNumber || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Joined</p>
                            <p className="text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${user.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {user.isEmailVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setUserForm({ name: user.name, email: user.email, password: '', designation: user.designation || '', phoneNumber: user.phoneNumber || '' });
                            setShowUserModal(true);
                          }}
                          className="flex-1 sm:flex-initial p-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          title="Edit"
                        >
                          <FiEdit2 size={18} className="mx-auto" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this user?')) {
                              handleDeleteUser(user._id);
                            }
                          }}
                          className="flex-1 sm:flex-initial p-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <FiTrash2 size={18} className="mx-auto" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingUser ? 'Edit User' : 'Add User'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Designation</label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={userForm.designation}
                  onChange={e => setUserForm({ ...userForm, designation: e.target.value })}
                  placeholder="e.g. Sales Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={userForm.phoneNumber}
                  onChange={e => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {editingUser ? 'New Password (optional)' : 'Password'}
                </label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  type="password"
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Secure password'}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                  onClick={async () => {
                    try {
                      if (editingUser) {
                        await updateUser(editingUser._id, userForm);
                        setMessage({ type: 'success', text: 'User updated successfully' });
                      } else {
                        await createUser(userForm);
                        setMessage({ type: 'success', text: 'User created successfully' });
                      }
                      setShowUserModal(false);
                      loadUsers();
                      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                    } catch (e) {
                      alert(e.message);
                    }
                  }}
                >
                  Save
                </button>
                <button
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition"
                  onClick={() => setShowUserModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}