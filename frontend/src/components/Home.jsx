import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiEye, FiEdit2, FiCopy, FiTrash2, FiChevronDown, FiChevronUp, FiFileText } from 'react-icons/fi';
import {
  listExhibitions,
  getLiveExhibitions,
  deleteExhibition,
  duplicateExhibition
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

export default function Home({ activeExhibition, handleOpenCreate }) {
  const navigate = useNavigate();
  const [exhibitions, setExhibitions] = useState([]);
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('live');
  const [expandedCard, setExpandedCard] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
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

  useEffect(() => {
    (async () => {
      setLoading(false);
      await loadExhibitions();
    })();
  }, []);

  const getStatusInfo = (ex) => {
    const isLive = live.find((l) => l._id === ex._id) != null;
    const now = new Date();
    const startTime = new Date(ex.startTime);
    const endTime = new Date(ex.endTime);
    endTime.setHours(endTime.getHours() + 12);
    const isUpcoming = startTime > now && !isLive;
    const isCompleted = endTime < now && !isLive;

    if (isLive) return { status: 'Live', color: 'bg-green-400' };
    if (isUpcoming) return { status: 'Upcoming', color: 'bg-blue-300' };
    if (isCompleted) return { status: 'Completed', color: 'bg-gray-400' };
    return { status: 'Pending', color: 'bg-gray-400' };
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

    if (activeTab === 'live') return matchesSearch && isLive;
    if (activeTab === 'upcoming') return matchesSearch && isUpcoming;
    if (activeTab === 'completed') return matchesSearch && isCompleted;
    return matchesSearch;
  });

  const liveCount = exhibitions.filter(ex => live.find(l => l._id === ex._id)).length;
  const upcomingCount = exhibitions.filter(ex => {
    const now = new Date();
    const startTime = new Date(ex.startTime);
    const isLive = live.find(l => l._id === ex._id) != null;
    return startTime > now && !isLive;
  }).length;
  const completedCount = exhibitions.filter(ex => {
    const now = new Date();
    const endTime = new Date(ex.endTime);
    endTime.setHours(endTime.getHours() + 12);
    const isLive = live.find(l => l._id === ex._id) != null;
    return endTime < now && !isLive;
  }).length;

  const handleDelete = async (id) => {
    try {
      await deleteExhibition(id);
      setMessage({ type: 'success', text: 'Exhibition deleted successfully' });
      await loadExhibitions();
      setDeleteConfirm(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to delete exhibition' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleDuplicate = async (ex) => {
    try {
      await duplicateExhibition(ex._id);
      setMessage({ type: 'success', text: 'Exhibition duplicated successfully' });
      await loadExhibitions();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to duplicate exhibition' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
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

        <div className="mb-8">
          <div className="flex items-center gap-6 mb-4">
            <button
              onClick={() => setActiveTab('live')}
              className={`pb-2 font-semibold transition ${
                activeTab === 'live'
                  ? 'text-gray-900 border-b-4 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live Exhibitions
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`pb-2 font-semibold transition ${
                activeTab === 'upcoming'
                  ? 'text-gray-900 border-b-4 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`pb-2 font-semibold transition ${
                activeTab === 'completed'
                  ? 'text-gray-900 border-b-4 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed
            </button>
          </div>
          <div className="border-b border-gray-300"></div>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={handleOpenCreate}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            <FiPlus size={20} />
            Create Exhibition
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
          <input
            type="text"
            placeholder={`Search ${activeTab} exhibitions...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition bg-white"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Live Card */}
          <button
            onClick={() => setActiveTab('live')}
            className={`p-5 rounded-xl border transition cursor-pointer ${
              activeTab === 'live'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900'
            }`}
          >
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${activeTab === 'live' ? 'text-blue-100' : 'text-gray-600'}`}>
              Live Exhibitions
            </p>
            <p className={`text-3xl font-bold ${activeTab === 'live' ? 'text-white' : 'text-gray-900'}`}>
              {liveCount}
            </p>
          </button>

          {/* Upcoming Card */}
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`p-5 rounded-xl border transition cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900'
            }`}
          >
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${activeTab === 'upcoming' ? 'text-blue-100' : 'text-gray-600'}`}>
              Upcoming
            </p>
            <p className={`text-3xl font-bold ${activeTab === 'upcoming' ? 'text-white' : 'text-gray-900'}`}>
              {upcomingCount}
            </p>
          </button>

          {/* Completed Card */}
          <button
            onClick={() => setActiveTab('completed')}
            className={`p-5 rounded-xl border transition cursor-pointer col-span-2 lg:col-span-1 ${
              activeTab === 'completed'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900'
            }`}
          >
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${activeTab === 'completed' ? 'text-blue-100' : 'text-gray-600'}`}>
              Completed
            </p>
            <p className={`text-3xl font-bold ${activeTab === 'completed' ? 'text-white' : 'text-gray-900'}`}>
              {completedCount}
            </p>
          </button>
        </div>

        {/* Exhibitions List - Blue Card Design */}
        {filteredExhibitions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No {activeTab} exhibitions found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredExhibitions.map((ex) => {
              const statusInfo = getStatusInfo(ex);
              const country = countries.find(c => c.code === ex.country);
              const isExpanded = expandedCard === ex._id;

              return (
                <div key={ex._id} className="bg-blue-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg hover:shadow-xl transition">
                  {/* Initial View - 4 Fields */}
                  <div className="space-y-4 mb-6">
                    {/* Name */}
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Name</span>
                      <span className="text-white font-semibold text-right">{ex.name}</span>
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Start</span>
                      <span className="text-white font-semibold text-right">{formatInTimezone(ex.startTime, ex.timezone)}</span>
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">End</span>
                      <span className="text-white font-semibold text-right">{formatInTimezone(ex.endTime, ex.timezone)}</span>
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Timezone</span>
                      <span className="text-white font-semibold text-right">{ex.timezone || '—'}</span>
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Country</span>
                      <span className="text-white font-semibold text-right">{country?.flag} {country?.name || ex.country}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 mb-6 border-t border-blue-500 pt-6">
                      {/* Location */}
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Location</span>
                        <span className="text-white font-semibold text-right">{ex.locationType || '—'}</span>
                      </div>

                      {ex.venue && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Venue</span>
                          <span className="text-white font-semibold text-right">{ex.venue}</span>
                        </div>
                      )}

                      {/* Org Details */}
                      {ex.organizationDetails && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Org. Details</span>
                          <span className="text-white font-semibold text-right">{ex.organizationDetails}</span>
                        </div>
                      )}

                      {/* Contact Person */}
                      {ex.organizerContactPerson && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Contact Person</span>
                          <span className="text-white font-semibold text-right">{ex.organizerContactPerson}</span>
                        </div>
                      )}

                      {/* Mobile */}
                      {ex.organizerMobile && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Mobile</span>
                          <a href={`tel:${ex.organizerMobile}`} className="text-white font-semibold text-right hover:underline">
                            {ex.organizerMobile}
                          </a>
                        </div>
                      )}

                      {/* Email */}
                      {ex.organizerEmail && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Email</span>
                          <a href={`mailto:${ex.organizerEmail}`} className="text-white font-semibold text-right hover:underline break-all">
                            {ex.organizerEmail}
                          </a>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold bg-green-400 ${statusInfo.color}`}>
                          {statusInfo.status}
                        </span>
                      </div>

                      {/* Created By */}
                      {ex.createdBy && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-blue-100 font-bold text-sm uppercase tracking-wider">Created By</span>
                          <span className="text-white font-semibold text-right">{ex.createdBy}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show More/Less Button */}
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : ex._id)}
                    className="w-full bg-white text-blue-600 font-semibold py-3 rounded-lg mb-4 flex items-center justify-center gap-2 hover:bg-gray-100 transition"
                  >
                    {isExpanded ? (
                      <>
                        <FiChevronUp size={18} />
                        Show Less
                      </>
                    ) : (
                      <>
                        <FiChevronDown size={18} />
                        Show More Details
                      </>
                    )}
                  </button>

                  {/* Actions Section */}
                  <div className="border-t border-blue-500 pt-6">
                    <p className="text-blue-100 font-bold text-sm uppercase tracking-wider mb-4">Actions</p>

                    {/* Primary Action - Checklist Button */}
                    <button
                      onClick={() => navigate(`/exhibition-form/${ex._id}`)}
                      className="w-full bg-white text-blue-600 font-semibold py-3 rounded-lg mb-4 transition hover:bg-gray-100 flex items-center justify-center gap-2"
                    >
                      <FiFileText size={18} />
                      Checklist
                    </button>

                    {/* Icon Action Buttons */}
                    <div className="grid grid-cols-5 gap-3">
                      {/* View */}
                      <button
                        onClick={() => navigate(`/exhibition/${ex._id}`)}
                        className="p-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition flex items-center justify-center"
                        title="View"
                      >
                        <FiEye size={20} />
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={() => handleDuplicate(ex)}
                        className="p-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition flex items-center justify-center"
                        title="Duplicate"
                      >
                        <FiCopy size={20} />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => navigate(`/exhibition/${ex._id}`)}
                        className="p-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition flex items-center justify-center"
                        title="Edit"
                      >
                        <FiEdit2 size={20} />
                      </button>

                      {/* Toggle/More */}
                      <button
                        onClick={() => setExpandedCard(isExpanded ? null : ex._id)}
                        className="p-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition flex items-center justify-center"
                        title="Toggle Details"
                      >
                        {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirm(ex._id)}
                        className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center"
                        title="Delete"
                      >
                        <FiTrash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Spacer for mobile bottom nav */}
        <div className="h-24 lg:h-0"></div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Exhibition?</h2>
            <p className="text-gray-600 mb-6">This action cannot be undone.</p>

            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}