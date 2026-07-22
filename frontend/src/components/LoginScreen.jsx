import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Hospital, AlertCircle, ShieldAlert } from 'lucide-react';
import logo from './ramaiah.png';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      // Pass the token and operator details back to the App
      onLoginSuccess(data.token, data.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
        <div className="flex flex-col items-center mb-10 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-20 h-20 bg-surface-container-lowest rounded-2xl flex items-center justify-center ambient-shadow mb-4 border border-outline-variant/10"
          >
            <img src={logo} alt="PES University" className="w-16 h-16 object-contain" />
          </motion.div>
          
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline">
            PESU Hospital
          </h1>
          <p className="text-on-surface-variant font-medium text-sm mt-1.5 uppercase tracking-widest font-sans">
            Aadhaar OCR Operator Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 ambient-shadow border border-outline-variant/10 relative">
          <div className="mb-6">
            <h2 className="text-xl font-bold font-headline text-on-surface">Operator Sign In</h2>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Enter your registration desk credentials to access the Aadhaar OCR portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="e.g. admin"
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
              {isLoading ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  Signing In...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-widest mt-8">
          © 2026 RAMAIAH HOSPITAL. Authorized Access Only.
        </p>
      </motion.div>
    </div>
  );
}
