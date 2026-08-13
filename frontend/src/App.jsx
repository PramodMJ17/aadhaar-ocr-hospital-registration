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

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [admin, setAdmin] = useState(() => {
    const savedAdmin = localStorage.getItem('admin');
    return savedAdmin ? JSON.parse(savedAdmin) : null;
  });
  const [step, setStep] = useState(token ? 'dashboard' : 'upload');
  console.log("Current Step:", step);
  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState(INITIAL_PATIENT_DATA);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const notificationTimerRef = useRef(null);

  const handleLoginSuccess = (newToken, newAdmin) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('admin', JSON.stringify(newAdmin));
    setToken(newToken);
    setAdmin(newAdmin);
    setStep('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    setToken('');
    setAdmin(null);
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
  console.log("🔥 handleReset CALLED");

  clearNotification();
  setStep("upload");
  setImage(null);
  setExtractedData(INITIAL_PATIENT_DATA);
  setRegistrationResult(null);
};

 const handleNavigate = (destination) => {
  console.log("🔥 handleNavigate", destination);

  if (
    destination === "dashboard" ||
    destination === "upload" ||
    destination === "history"
  ) {
    setStep(destination);
  }
};

 const handleBack = () => {
  console.log("handleBack CALLED", step);

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
  console.log("Register button clicked");

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

    console.log("Response Status:", res.status);

    const body = await res.json().catch(() => ({}));

    console.log("Response Body:", body);

    if (!res.ok) {
      const message = body?.error || 'Registration failed. Please try again.';
      showNotification(message, 'error');
    } else if (body.success) {
      console.log("Moving to Success Screen");

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

    const message =
      err instanceof Error
        ? err.message
        : 'Registration service unavailable.';

    showNotification(message, 'error');

    registrationResult = {
      success: false,
      existing: false,
      patient: payload,
    };
  }

  console.log("Final Registration Result:", registrationResult);

  setRegistrationResult(registrationResult);

  console.log("Changing step to success");

  setStep('success');
};
  if (!token) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout 
      currentStep={step} 
      onBack={step !== 'upload' && step !== 'dashboard' ? handleBack : undefined}
      onNavigate={handleNavigate}
      admin={admin}
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