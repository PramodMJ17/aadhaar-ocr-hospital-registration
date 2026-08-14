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

export async function grantPatientPortalAccess(hospitalId, password, token) {
  const response = await fetch(`${BACKEND_URL}/api/auth/patient/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ hospitalId, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to grant portal access.');
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

// Doctor Management API Helpers
export async function createDoctor(doctorData, token) {
  const response = await fetch(`${BACKEND_URL}/api/doctors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(doctorData)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create doctor account.');
  }
  return data;
}

export async function fetchDoctors(token, includeInactive = true) {
  const response = await fetch(`${BACKEND_URL}/api/doctors?includeInactive=${includeInactive}`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch doctors list.');
  }
  return data;
}

export async function fetchDoctorDetails(id, token) {
  const response = await fetch(`${BACKEND_URL}/api/doctors/${id}`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch doctor details.');
  }
  return data;
}

export async function updateDoctor(id, doctorData, token) {
  const response = await fetch(`${BACKEND_URL}/api/doctors/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(doctorData)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update doctor profile.');
  }
  return data;
}

export async function updateDoctorSchedule(id, schedules, token) {
  const response = await fetch(`${BACKEND_URL}/api/doctors/${id}/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ schedules })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update doctor schedule.');
  }
  return data;
}

export async function fetchDoctorSchedule(id, token) {
  const response = await fetch(`${BACKEND_URL}/api/doctors/${id}/schedule`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch doctor schedule.');
  }
  return data;
}

export async function addDoctorUnavailability(id, leaveData, token) {
  const response = await fetch(`${BACKEND_URL}/api/doctors/${id}/unavailability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(leaveData)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to add doctor leave entry.');
  }
  return data;
}

export async function fetchDoctorUnavailability(id, token) {
  const response = await fetch(`${BACKEND_URL}/api/doctors/${id}/unavailability`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch doctor leave records.');
  }
  return data;
}

export async function deleteDoctorUnavailability(id, unavailabilityId, token) {
  const response = await fetch(`${BACKEND_URL}/api/doctors/${id}/unavailability/${unavailabilityId}`, {
    method: 'DELETE',
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove doctor leave entry.');
  }
  return data;
}

// Clinical Consultation, Appointment Slot Booking, & Prescription API Helpers
export async function fetchDoctorSlots(doctorId, date, token) {
  const response = await fetch(`${BACKEND_URL}/api/doctors/${doctorId}/slots?date=${date}`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch available doctor slots.');
  }
  return data;
}

export async function bookAppointment(appointmentData, token) {
  const response = await fetch(`${BACKEND_URL}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(appointmentData)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to book appointment.');
  }
  return data;
}

export async function fetchMyAppointments(token) {
  const response = await fetch(`${BACKEND_URL}/api/appointments`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch appointments queue.');
  }
  return data;
}

export async function updateAppointmentStatus(id, status, token) {
  const response = await fetch(`${BACKEND_URL}/api/appointments/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ status })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update appointment status.');
  }
  return data;
}

export async function createConsultation(consultationData, token) {
  const response = await fetch(`${BACKEND_URL}/api/consultations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(consultationData)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to record consultation.');
  }
  return data;
}

export async function createPrescription(prescriptionData, token) {
  const response = await fetch(`${BACKEND_URL}/api/prescriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(prescriptionData)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create prescription.');
  }
  return data;
}

export async function fetchPatientPrescriptions(token) {
  const response = await fetch(`${BACKEND_URL}/api/prescriptions/patient/my-prescriptions`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch patient prescriptions.');
  }
  return data;
}

export async function fetchPrescriptionDetails(id, token) {
  const response = await fetch(`${BACKEND_URL}/api/prescriptions/${id}`, {
    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch prescription details.');
  }
  return data;
}
