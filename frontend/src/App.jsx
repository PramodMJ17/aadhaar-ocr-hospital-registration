/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import UploadScreen from './components/UploadScreen';
import ScanningScreen from './components/ScanningScreen';
import ReviewScreen from './components/ReviewScreen';
import SuccessScreen from './components/SuccessScreen';
import Dashboard from './components/Dashboard';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import DoctorManagement from './components/DoctorManagement';
import DoctorScheduleManager from './components/DoctorScheduleManager';
import PatientAppointmentBooking from './components/PatientAppointmentBooking';
import PatientMedicalHistory from './components/PatientMedicalHistory';
import LoginScreen from './components/LoginScreen';
import PatientHistory from './components/PatientHistory';

const INITIAL_PATIENT_DATA = {
  fullName: '',
  dob: '',
  gender: '',
  aadhaarNumber: '',
  mobile: '',
  address: '',
};

const BACKEND_URL = 'http://localhost:5000';

function getInitialStep(token, user) {
  if (!token) return 'upload';
  const role = user?.role || 'ADMIN';
  if (role === 'DOCTOR') return 'doctor-dashboard';
  if (role === 'PATIENT') return 'patient-dashboard';
  return 'dashboard';
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user') || localStorage.getItem('admin');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [step, setStep] = useState(() => getInitialStep(token, user));
  const [targetDoctorId, setTargetDoctorId] = useState('');

  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState(INITIAL_PATIENT_DATA);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const notificationTimerRef = useRef(null);

  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('admin', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    const initialRoleStep = getInitialStep(newToken, newUser);
    setStep(initialRoleStep);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin');
    setToken('');
    setUser(null);
    setStep('upload');
    setImage(null);
    setExtractedData(INITIAL_PATIENT_DATA);
    setRegistrationResult(null);
    clearNotification();
  };

  const clearNotification = () => {
    setNotification(null);
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
  };

  const showNotification = (message, type = 'error') => {
    setNotification({ message, type });
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = window.setTimeout(() => {
      setNotification(null);
      notificationTimerRef.current = null;
    }, 5000);
  };

  const handleReset = () => {
    clearNotification();
    setStep("upload");
    setImage(null);
    setExtractedData(INITIAL_PATIENT_DATA);
    setRegistrationResult(null);
  };

  const handleNavigate = (destination) => {
    if ([
      "dashboard", "upload", "history",
      "doctor-dashboard", "patient-dashboard",
      "doctors", "schedules", "book-appointment", "my-records"
    ].includes(destination)) {
      setStep(destination);
    }
  };

  const handleNavigateDoctorSchedule = (doctorId) => {
    setTargetDoctorId(doctorId);
    setStep('schedules');
  };

  const handleBack = () => {
    if (step === "scanning") setStep("upload");
    if (step === "review") setStep("upload");
    if (step === "success") setStep("review");
  };

  const handleUploadComplete = (img) => {
    setRegistrationResult(null);
    setImage(img);
    setStep('scanning');
  };

  const handleScanComplete = (data) => {
    setExtractedData(data);
    setStep('review');
  };

  const handleRegister = async (updatedData) => {
    const payload = {
      fullName: updatedData.fullName || '',
      dob: updatedData.dob || '',
      gender: updatedData.gender || '',
      aadhaarNumber: updatedData.aadhaarNumber || '',
      mobile: updatedData.mobile || '',
      address: updatedData.address || '',
    };

    setExtractedData(payload);

    let registrationResult = {
      success: false,
      existing: false,
      patient: payload,
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = body?.error || 'Registration failed. Please try again.';
        showNotification(message, 'error');
      } else if (body.success) {
        registrationResult = {
          success: true,
          existing: body.existing === true,
          patient: body.patient || payload,
        };
      } else {
        const message = body?.message || 'Registration response was unexpected.';
        showNotification(message, 'warning');
      }
    } catch (err) {
      console.error("Registration Error:", err);
      const message = err instanceof Error ? err.message : 'Registration service unavailable.';
      showNotification(message, 'error');
      registrationResult = {
        success: false,
        existing: false,
        patient: payload,
      };
    }

    setRegistrationResult(registrationResult);
    setStep('success');
  };

  if (!token) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout 
      currentStep={step} 
      onBack={step !== 'upload' && step !== 'dashboard' && step !== 'doctor-dashboard' && step !== 'patient-dashboard' ? handleBack : undefined}
      onNavigate={handleNavigate}
      user={user}
      admin={user}
      onLogout={handleLogout}
      notification={notification}
      onClearNotification={clearNotification}
    >
      {step === 'dashboard' && (
        <Dashboard
          token={token}
          onError={(message) => showNotification(message, 'error')}
        />
      )}

      {step === 'doctors' && (
        <DoctorManagement
          token={token}
          onNavigateSchedule={handleNavigateDoctorSchedule}
          onError={(message) => showNotification(message, 'error')}
        />
      )}

      {step === 'schedules' && (
        <DoctorScheduleManager
          token={token}
          initialDoctorId={targetDoctorId}
          onError={(message) => showNotification(message, 'error')}
        />
      )}

      {step === 'doctor-dashboard' && (
        <DoctorDashboard
          user={user}
          token={token}
          onError={(message) => showNotification(message, 'error')}
        />
      )}

      {step === 'patient-dashboard' && (
        <PatientDashboard
          user={user}
          token={token}
          onNavigateBook={() => setStep('book-appointment')}
          onNavigateRecords={() => setStep('my-records')}
          onError={(message) => showNotification(message, 'error')}
        />
      )}

      {step === 'book-appointment' && (
        <PatientAppointmentBooking
          token={token}
          onBookingSuccess={() => setStep('patient-dashboard')}
          onError={(message) => showNotification(message, 'error')}
        />
      )}

      {step === 'my-records' && (
        <PatientMedicalHistory
          token={token}
        />
      )}

      {step === 'history' && (
        <PatientHistory />
      )}

      {step === 'upload' && (
        <UploadScreen onNext={handleUploadComplete} />
      )}
      
      {step === 'scanning' && image && (
        <ScanningScreen 
          image={image} 
          onComplete={handleScanComplete}
          onError={(err) => showNotification(err, 'error')}
        />
      )}
      
      {step === 'review' && (
        <ReviewScreen 
          data={extractedData} 
          image={image}
          onNext={handleRegister}
          onBack={() => setStep('upload')}
        />
      )}
      
      {step === 'success' && (
        <SuccessScreen
          data={extractedData}
          result={registrationResult}
          onReset={handleReset}
          onViewData={() => setStep('review')}
        />
      )}
    </Layout>
  );
}