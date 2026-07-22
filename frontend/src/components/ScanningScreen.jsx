import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, ShieldCheck, AlertCircle } from 'lucide-react';
import { performAadhaarOCR } from '../services/apiService';

export default function ScanningScreen({ image, onComplete, onError }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function scan() {
      try {
        const data = await performAadhaarOCR(image);
        if (isMounted) {
          onComplete(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "An unexpected error occurred");
          onError(err instanceof Error ? err.message : "An unexpected error occurred");
        }
      }
    }

    scan();

    return () => {
      isMounted = false;
    };
  }, [image, onComplete, onError]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-12"
    >
      <div className="relative inline-block">
        <div className="absolute inset-0 -m-8 border-2 border-primary/5 rounded-full scale-110"></div>
        <div className="absolute inset-0 -m-4 border-2 border-primary/10 rounded-full scale-105"></div>
        
        <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full"></div>
          <div className="absolute inset-0 rounded-full border-[6px] border-surface-container-highest"></div>
          <div className="absolute inset-0 rounded-full border-[6px] border-primary animate-spin-custom shadow-lg shadow-primary/20"></div>
          
          <div className="absolute inset-10 bg-surface-container-lowest rounded-2xl shadow-inner flex flex-col items-center justify-center overflow-hidden">
            <div className="w-full h-full relative">
              <img 
                src={image} 
                alt="Scanning" 
                className="w-full h-full object-cover opacity-40 grayscale"
                referrerPolicy="no-referrer"
              />
              <div className="absolute w-full h-1 bg-primary shadow-[0_0_15px_rgba(0,71,141,0.8)] animate-scan z-10"></div>
            </div>
          </div>

          <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-white px-4 py-1.5 rounded-full shadow-md border border-outline-variant/20 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">OCR Engine Active</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {error ? (
          <div className="flex flex-col items-center gap-2 text-on-error-container">
            <AlertCircle className="w-12 h-12" />
            <h1 className="text-2xl font-headline font-bold">Extraction Failed</h1>
            <p className="text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 primary-gradient text-white px-6 py-2 rounded-xl font-bold"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight">
              Scanning Aadhaar card...
            </h1>
            <p className="text-on-surface-variant font-body text-base leading-relaxed">
              Extracting patient details using OCR. This ensures high accuracy and speeds up your registration.
              <span className="block mt-1 font-semibold text-primary">Please do not refresh this page.</span>
            </p>
          </>
        )}
      </div>

      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left w-full max-w-2xl">
          <div className="bg-surface-container-low p-5 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-headline font-bold text-sm text-on-surface">Secure Processing</h4>
              <p className="text-xs text-on-surface-variant mt-1 leading-normal">Data is processed in an encrypted sandbox environment.</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-5 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <ShieldCheck className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h4 className="font-headline font-bold text-sm text-on-surface">Verification</h4>
              <p className="text-xs text-on-surface-variant mt-1 leading-normal">Checking authenticity against government databases.</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
