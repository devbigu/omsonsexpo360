// Determine backend URL - use localhost in development, Render URL in production
const getBackendBase = () => {
  // Check for explicit env var first
  if (import.meta.env.VITE_BACKEND_URL) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '');
    console.log('🔗 Using VITE_BACKEND_URL from .env file:', backendUrl);
    return backendUrl;
  }

  // Check for window variable (runtime config)
  if (typeof window !== 'undefined' && window.BACKEND_URL) {
    const backendUrl = window.BACKEND_URL.replace(/\/$/, '');
    console.log('🔗 Using window.BACKEND_URL (runtime config):', backendUrl);
    return backendUrl;
  }

  // Default: localhost for development, Render URL for production
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  if (isDevelopment) {
    console.log('🔗 Using development default: http://localhost:5000');
    return 'http://localhost:5000';
  }

  const productionUrl = 'https://omsonsexpo360.com/';
  console.log('🔗 Using production default:', productionUrl);
  return productionUrl;
};

const BACKEND_BASE = getBackendBase();
console.log('🔗 Backend URL:', BACKEND_BASE);

// Helper to get auth header
const getAuthHeaders = (contentType = 'application/json') => {
  const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
  const headers = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Helper for FormData headers (no Content-Type, let browser set it with boundary)
const getFormDataHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function saveCardEntry(imageFiles, audioBlob, fields, exhibitionId = null, createdBy = '') {
  const form = new FormData();

  // Handle multiple images (up to 5)
  if (imageFiles && Array.isArray(imageFiles)) {
    imageFiles.forEach((file, index) => {
      if (file) {
        form.append('image', file, file.name || `card-${index}.jpg`);
      }
    });
  } else if (imageFiles) {
    // Backward compatibility: single file
    form.append('image', imageFiles, imageFiles.name || 'card.jpg');
  }

  if (audioBlob) form.append('audio', audioBlob, 'audio.webm');
  form.append('fields', JSON.stringify(fields || {}));
  if (exhibitionId) form.append('exhibitionId', exhibitionId);
  if (createdBy) form.append('createdBy', createdBy);

  const url = `${BACKEND_BASE}/api/cards/save-entry`;
  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers: getFormDataHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Server error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function extractOcr(imageFile) {
  const form = new FormData();
  form.append('image', imageFile, imageFile.name || 'card.jpg');
  const url = `${BACKEND_BASE}/api/cards/extract-ocr`;
  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers: getFormDataHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OCR error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getCards() {
  const url = `${BACKEND_BASE}/api/cards/`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Fetch error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getCardsForExhibition(exhibitionId) {
  const url = `${BACKEND_BASE}/api/cards/?exhibitionId=${encodeURIComponent(exhibitionId)}`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Fetch error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function createExhibition({
  name,
  startTime,
  endTime,
  timezone,
  country,
  locationType = '',
  venue = '',
  organizationDetails = '',
  organizerContactPerson = '',
  organizerEmail = '',
  organizerMobile = '',
  createdBy = '',
}) {
  const url = `${BACKEND_BASE}/api/exhibitions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name,
      startTime,
      endTime,
      timezone,
      country,
      locationType,
      venue,
      organizationDetails,
      organizerContactPerson,
      organizerEmail,
      organizerMobile,
      createdBy,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Create exhibition error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function updateExhibition(id, data) {
  const url = `${BACKEND_BASE}/api/exhibitions/${id}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Update exhibition error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function duplicateExhibition(id, createdBy = '') {
  const url = `${BACKEND_BASE}/api/exhibitions/${id}/duplicate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ createdBy })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Duplicate exhibition error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function deleteExhibition(id) {
  const url = `${BACKEND_BASE}/api/exhibitions/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Delete exhibition error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function listExhibitions() {
  const url = `${BACKEND_BASE}/api/exhibitions`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Fetch exhibitions error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getLiveExhibitions() {
  const url = `${BACKEND_BASE}/api/exhibitions/live/today`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Fetch live exhibitions error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function signup(name, email, password) {
  const url = `${BACKEND_BASE}/api/users/signup`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Signup error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function sendOtp(email) {
  const url = `${BACKEND_BASE}/api/users/send-otp`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OTP send error ${res.status}: ${txt}`);
    }
    return res.json();
  } catch (error) {
    // Provide more helpful error messages
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error(`Cannot connect to backend at ${BACKEND_BASE}. Make sure the backend server is running.`);
    }
    throw error;
  }
}

export async function verifyOtp(email, otp) {
  const url = `${BACKEND_BASE}/api/users/verify-otp`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OTP verification error ${res.status}: ${txt}`);
  }
  return res.json();
}

// Login without OTP - IP approval only
export async function login(email, password, otp = null) {
  // OTP parameter commented out - can be re-enabled later
  // export async function login(email, password, otp) {
  const url = `${BACKEND_BASE}/api/users/login`;
  const body = { email, password };
  // OTP removed from request body - can be re-enabled later
  // if (otp) body.otp = otp;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Login error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function checkAccess() {
  const url = `${BACKEND_BASE}/api/users/check-access`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Access check error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getCurrentUser() {
  const url = `${BACKEND_BASE}/api/users/me`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Get user error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function adminLogin(email, password) {
  const url = `${BACKEND_BASE}/api/admin/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Admin login error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getAdminProfile() {
  const url = `${BACKEND_BASE}/api/admin/me`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Get admin profile error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function updateAdminProfile(data) {
  const url = `${BACKEND_BASE}/api/admin/me`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Update profile error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getIpRequests() {
  const url = `${BACKEND_BASE}/api/admin/ip-requests`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Get IP requests error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function approveIpRequest(requestId, approved) {
  const url = `${BACKEND_BASE}/api/admin/ip-requests/${requestId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approved }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Approve IP request error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function updateCard(cardId, fields) {
  const url = `${BACKEND_BASE}/api/cards/${cardId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Update card error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getExhibitionChecklist(exhibitionId) {
  const url = `${BACKEND_BASE}/api/exhibitions/${exhibitionId}/checklist`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Get checklist error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function updateExhibitionChecklist(exhibitionId, formData) {
  const url = `${BACKEND_BASE}/api/exhibitions/${exhibitionId}/checklist`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      // Content-Type not set for FormData, but Auth header is needed
      'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('adminToken')}`
    },
    body: formData,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Update checklist error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function exportAllExhibitions() {
  const url = `${BACKEND_BASE}/api/admin/export/exhibitions`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Export exhibitions error ${res.status}: ${txt}`);
  }
  return res.blob();
}

export async function exportExhibitionCards(exhibitionId) {
  const url = `${BACKEND_BASE}/api/admin/export/exhibitions/${exhibitionId}/cards`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Export cards error ${res.status}: ${txt}`);
  }
  return res.blob();
}

export async function getUsers() {
  const url = `${BACKEND_BASE}/api/admin/users`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Get users error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getAllUsers() {
  const url = `${BACKEND_BASE}/api/users`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Get all users error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function createUser(userData) {
  const url = `${BACKEND_BASE}/api/admin/users`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Create user error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function updateUser(id, userData) {
  const url = `${BACKEND_BASE}/api/admin/users/${id}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Update user error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function deleteUser(id) {
  const url = `${BACKEND_BASE}/api/admin/users/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Delete user error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function getAdmins() {
  const url = `${BACKEND_BASE}/api/admin/admins`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Get admins error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function createAdmin(adminData) {
  const url = `${BACKEND_BASE}/api/admin/admins`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(adminData),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Create admin error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function updateAdmin(id, adminData) {
  const url = `${BACKEND_BASE}/api/admin/admins/${id}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(adminData),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Update admin error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function deleteAdmin(id) {
  const url = `${BACKEND_BASE}/api/admin/admins/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Delete admin error ${res.status}: ${txt}`);
  }
  return res.json();
}
