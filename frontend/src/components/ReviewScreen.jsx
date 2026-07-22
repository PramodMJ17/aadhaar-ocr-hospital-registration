import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Info, CheckCircle2, Lock, AlertTriangle, Lightbulb, RotateCcw, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ReviewScreen({ data, image, onNext, onBack }) {
  const [formData, setFormData] = useState({
    fullName: data.fullName || '',
    aadhaarNumber: data.aadhaarNumber || '',
    dob: data.dob || '',
    gender: data.gender || '',
    address: data.address || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirm = () => {
    onNext(formData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Review Extracted Details</h1>
        <p className="text-on-surface-variant max-w-2xl">
          We've automatically extracted your information from the Aadhaar card. Please verify and correct any inaccuracies to ensure seamless hospital registration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* OCR Preview Card */}
        <div className="bg-surface-container-low rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden h-fit">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            {/* Abstract medical pattern simulation */}
            <div className="grid grid-cols-8 gap-4 p-4">
              {Array.from({ length: 32 }).map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-primary/20" />
              ))}
            </div>
          </div>
          
          <div className="relative z-10 w-full max-w-sm aspect-[1.6/1] bg-white rounded-lg shadow-2xl overflow-hidden border border-outline-variant/20">
            {image ? (
              <img 
                src={image} 
                alt="OCR Scan Result"
                className="w-full h-full object-cover grayscale-[0.2]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                <ShieldCheck className="w-12 h-12 text-on-surface-variant/20" />
              </div>
            )}
            <div className="absolute top-4 right-4 bg-secondary text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <ShieldCheck className="w-3 h-3" />
              CARD CAPTURED
            </div>
          </div>
          
          <p className="mt-6 text-sm font-medium text-on-surface-variant flex items-center gap-2">
            <Info className="w-4 h-4" />
            Original document reference for verification
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 ambient-shadow border border-outline-variant/10 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-8 bg-primary rounded-full"></div>
            <h3 className="text-xl font-headline font-bold text-on-surface">Personal Information</h3>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <input 
                  name="fullName"
                  className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-on-surface font-headline font-semibold focus:ring-2 focus:ring-primary transition-all"
                  type="text" 
                  value={formData.fullName}
                  onChange={handleChange}
                />
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary w-4 h-4" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">Aadhaar Number</label>
                <div className="relative">
                  <input 
                    name="aadhaarNumber"
                    className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-on-surface font-headline font-semibold focus:ring-2 focus:ring-primary cursor-not-allowed"
                    readOnly
                    type="text" 
                    value={formData.aadhaarNumber}
                    onChange={handleChange}
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">Date of Birth</label>
                <input 
                  name="dob"
                  className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-on-surface font-headline font-semibold focus:ring-2 focus:ring-primary"
                  type="text" 
                  value={formData.dob}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">Gender</label>
                <select 
                  name="gender"
                  className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-on-surface font-headline font-semibold focus:ring-2 focus:ring-primary appearance-none"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-error-container uppercase tracking-wider flex items-center gap-1">
                Residential Address
                <AlertTriangle className="w-3 h-3" />
              </label>
              <div className="relative">
                <textarea 
                  name="address"
                  className="w-full bg-error-container border-2 border-on-error-container/10 rounded-lg px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-on-error-container/50 transition-all"
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                />
                <div className="mt-2 text-[11px] text-on-error-container flex items-center gap-1 font-medium">
                  <Lightbulb className="w-3 h-3" />
                  {data.confidence || "Please verify extraction details."}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={onBack}
              className="flex-1 px-6 py-4 rounded-xl border-2 border-surface-container-highest text-primary font-bold text-sm hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Re-scan Document
            </button>
            <button 
              onClick={handleConfirm}
              className="flex-[1.5] px-6 py-4 rounded-xl primary-gradient text-white font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Confirm & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
