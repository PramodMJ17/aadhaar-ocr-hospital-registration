const BACKEND_URL = 'http://localhost:5000';

export async function performAadhaarOCR(imageDataUrl) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BACKEND_URL}/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ image: imageDataUrl })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Sign-in session expired. Please log in again.');
      }
      throw new Error(`OCR Processing Failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in performAadhaarOCR:', error);
    throw error;
  }
}

export async function loginStaff(username, password) {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Staff login failed. Please check credentials.');
  }
  return data;
}

export async function loginPatient(hospitalId, password) {
  const response = await fetch(`${BACKEND_URL}/api/auth/patient/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospitalId, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Patient login failed. Please check Hospital ID & password.');
  }
  return data;
}

export async function registerPatientUser(hospitalId, password, aadhaarNumber) {
  const response = await fetch(`${BACKEND_URL}/api/auth/patient/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospitalId, password, aadhaarNumber })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Patient portal registration failed.');
  }
  return data;
}

export async function fetchAdminDashboard(token) {
  const response = await fetch(`${BACKEND_URL}/api/dashboard`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch dashboard metrics.');
  }
  return data;
}

export async function fetchPatientsList(token, page = 1, limit = 10) {
  const response = await fetch(`${BACKEND_URL}/patients?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch patients history.');
  }
  return data;
}

export async function registerPatient(payload, token) {
  const response = await fetch(`${BACKEND_URL}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed.');
  }
  return data;
}
