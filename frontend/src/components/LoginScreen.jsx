import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Hospital, AlertCircle, ShieldAlert, KeyRound, UserCheck, Stethoscope, HeartPulse } from 'lucide-react';
import logo from './ramaiah.png';
import { loginStaff, loginPatient, registerPatientUser } from '../services/apiService';

export default function LoginScreen({ onLoginSuccess }) {
  const [tab, setTab] = useState('staff'); // 'staff', 'patient', 'patient-setup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const data = await loginStaff(username, password);
      const user = data.admin || { username, role: 'ADMIN' };
      onLoginSuccess(data.token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const data = await loginPatient(hospitalId, password);
      const user = data.patient || { hospitalId, role: 'PATIENT' };
      onLoginSuccess(data.token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Patient login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSetupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const data = await registerPatientUser(hospitalId, password, aadhaarNumber);
      setSuccessMsg('Portal account created successfully! Please sign in with your Hospital ID & password.');
      setTab('patient');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Portal registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden font-sans">
      {/* Decorative Tonal Ambient Circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-20 h-20 bg-surface-container-lowest rounded-2xl flex items-center justify-center ambient-shadow mb-4 border border-outline-variant/10"
          >
            <img src={logo} alt="Ramaiah Memorial Hospital" className="w-16 h-16 object-contain" />
          </motion.div>
          
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline">
            Ramaiah Memorial Hospital
          </h1>
          <p className="text-on-surface-variant font-medium text-xs mt-1.5 uppercase tracking-widest font-sans">
            Integrated Healthcare Portal
          </p>
        </div>

        {/* Portal Selection Tabs */}
        <div className="flex bg-surface-container-low p-1.5 rounded-2xl mb-6 border border-outline-variant/10 gap-1">
          <button
            type="button"
            onClick={() => { setTab('staff'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'staff'
                ? 'bg-white text-primary shadow-md font-headline'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Hospital Staff
          </button>
          <button
            type="button"
            onClick={() => { setTab('patient'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'patient' || tab === 'patient-setup'
                ? 'bg-white text-secondary shadow-md font-headline'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            Patient Portal
          </button>
        </div>

        {/* Main Login / Setup Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 ambient-shadow border border-outline-variant/10 relative">

          {/* Staff Login Form */}
          {tab === 'staff' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold font-headline text-on-surface">Staff Portal Sign In</h2>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Enter your credentials (Admin, Receptionist, or Doctor) to access your workstation.
                </p>
              </div>

              <form onSubmit={handleStaffSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-error-container/50 border border-error-container text-on-error-container rounded-xl p-3.5 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-on-error-container" />
                    <span className="text-xs font-medium leading-normal">{error}</span>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4.5 w-4.5 text-on-surface-variant/40" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin or dr_smith"
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low text-on-surface rounded-xl outline-none border-2 border-transparent focus:border-primary transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4.5 w-4.5 text-on-surface-variant/40" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low text-on-surface rounded-xl outline-none border-2 border-transparent focus:border-primary transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 rounded-xl font-extrabold text-sm primary-gradient text-white shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all duration-150 relative overflow-hidden flex items-center justify-center gap-2 ${
                    isLoading ? 'opacity-85 cursor-wait' : 'hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {isLoading ? 'Signing In...' : 'Sign In to Workstation'}
                </button>
              </form>
            </div>
          )}

          {/* Patient Login Form */}
          {tab === 'patient' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold font-headline text-on-surface">Patient Portal Sign In</h2>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Enter your Hospital ID (`RMH-YYYY-XXXX`) and password to view your health records.
                </p>
              </div>

              <form onSubmit={handlePatientSubmit} className="space-y-5">
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs font-medium leading-relaxed"
                  >
                    {successMsg}
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-error-container/50 border border-error-container text-on-error-container rounded-xl p-3.5 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-on-error-container" />
                    <span className="text-xs font-medium leading-normal">{error}</span>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Hospital ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Hospital className="h-4.5 w-4.5 text-on-surface-variant/40" />
                    </div>
                    <input
                      type="text"
                      required
                      value={hospitalId}
                      onChange={(e) => setHospitalId(e.target.value)}
                      placeholder="e.g. RMH-2026-0001"
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low text-on-surface rounded-xl outline-none border-2 border-transparent focus:border-secondary transition-all text-sm font-medium font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4.5 w-4.5 text-on-surface-variant/40" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low text-on-surface rounded-xl outline-none border-2 border-transparent focus:border-secondary transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 rounded-xl font-extrabold text-sm success-gradient text-white shadow-lg shadow-secondary/20 hover:shadow-secondary/35 transition-all duration-150 flex items-center justify-center gap-2 ${
                    isLoading ? 'opacity-85 cursor-wait' : 'hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {isLoading ? 'Signing In...' : 'Sign In to Patient Portal'}
                </button>

                <div className="pt-2 text-center border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => { setTab('patient-setup'); setError(''); setSuccessMsg(''); }}
                    className="text-xs text-secondary font-bold hover:underline"
                  >
                    First time here? Activate Patient Account
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Patient Account Setup Form */}
          {tab === 'patient-setup' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold font-headline text-on-surface">Activate Patient Account</h2>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Verify your Hospital ID and Aadhaar Number to set your portal password.
                </p>
              </div>

              <form onSubmit={handlePatientSetupSubmit} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-error-container/50 border border-error-container text-on-error-container rounded-xl p-3.5 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-on-error-container" />
                    <span className="text-xs font-medium leading-normal">{error}</span>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Hospital Registration ID
                  </label>
                  <input
                    type="text"
                    required
                    value={hospitalId}
                    onChange={(e) => setHospitalId(e.target.value)}
                    placeholder="e.g. RMH-2026-0001"
                    className="w-full px-4 py-2.5 bg-surface-container-low text-on-surface rounded-xl outline-none border-2 border-transparent focus:border-secondary transition-all text-sm font-medium font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    12-Digit Aadhaar Number
                  </label>
                  <input
                    type="text"
                    required
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    placeholder="XXXX XXXX XXXX"
                    className="w-full px-4 py-2.5 bg-surface-container-low text-on-surface rounded-xl outline-none border-2 border-transparent focus:border-secondary transition-all text-sm font-medium font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Set Portal Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    className="w-full px-4 py-2.5 bg-surface-container-low text-on-surface rounded-xl outline-none border-2 border-transparent focus:border-secondary transition-all text-sm font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 rounded-xl font-extrabold text-sm success-gradient text-white shadow-lg shadow-secondary/20 transition-all flex items-center justify-center gap-2 mt-2 ${
                    isLoading ? 'opacity-85 cursor-wait' : 'hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {isLoading ? 'Activating...' : 'Activate Portal Access'}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setTab('patient'); setError(''); setSuccessMsg(''); }}
                    className="text-xs text-on-surface-variant hover:text-primary font-bold"
                  >
                    Back to Patient Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-widest mt-8">
          © 2026 RAMAIAH MEMORIAL HOSPITAL. Authorized Access Only.
        </p>
      </motion.div>
    </div>
  );
}
