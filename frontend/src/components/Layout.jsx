import React from 'react';
import { Bell, ChevronLeft, Upload, Scan, FileCheck, ShieldCheck } from 'lucide-react';
import logo from './ramaiah.png';
import { motion } from 'motion/react';

export default function Layout({ children, currentStep, onBack, onNavigate, admin, onLogout, notification, onClearNotification }) {
  const steps = [
    { id: 'upload', label: 'Upload Aadhaar', icon: Upload },
    { id: 'scanning', label: 'Scan Document', icon: Scan },
    { id: 'review', label: 'Review Details', icon: FileCheck },
    { id: 'success', label: 'Confirm Identity', icon: ShieldCheck },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const activeNav =
  currentStep === "dashboard"
    ? "dashboard"
    : currentStep === "history"
    ? "history"
    : "upload";
 const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'upload', label: 'Registration' },
  { id: 'history', label: 'Patient History' },
];

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-header px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-surface-container-highest transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-primary" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <img src={logo} alt="Ramaiah University" className="w-14 h-14 object-contain flex-shrink-0 -mt-1" />
            <h1 className="text-xl font-extrabold text-primary tracking-tight font-headline">
              Ramaiah Memorial Hospital
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {admin && (
            <div className="flex items-center gap-3 pr-2 border-r border-outline-variant/10">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                {admin.username ? admin.username.substring(0, 2) : 'OP'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-on-surface leading-none">{admin.name || 'Operator'}</span>
                <span className="text-[9px] font-semibold text-on-surface-variant/60 uppercase tracking-widest mt-0.5">Desk Admin</span>
              </div>
            </div>
          )}

          <button className="p-2 rounded-full hover:bg-surface-container-highest transition-colors">
            <Bell className="w-6 h-6 text-on-surface-variant" />
          </button>

          {admin && onLogout && (
            <button 
              onClick={onLogout}
              className="text-xs font-bold bg-surface-container-low hover:bg-error-container hover:text-on-error-container text-on-surface-variant px-3.5 py-1.5 rounded-lg transition-all duration-150 active:scale-95 border border-outline-variant/10"
            >
              Log Out
            </button>
          )}
        </div>
      </header>

      {notification && (
        <div className="fixed top-24 right-6 z-50 max-w-sm w-full">
          <div className={`rounded-2xl p-4 shadow-2xl border ${notification.type === 'error' ? 'bg-error-container/95 border-error-container text-on-error-container' : 'bg-surface-container-highest border-primary text-primary'} flex items-start justify-between gap-4`}> 
            <div>
              <p className="text-sm font-bold">{notification.type === 'error' ? 'Error' : 'Notice'}</p>
              <p className="mt-1 text-xs leading-relaxed">{notification.message}</p>
            </div>
            <button onClick={onClearNotification} className="text-xs font-bold uppercase tracking-wide opacity-80 hover:opacity-100">Dismiss</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row pt-20 max-w-7xl mx-auto w-full px-4 md:px-8 gap-8">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-6 w-80 py-8">
          <div className="bg-surface-container-low rounded-r-2xl p-6 ambient-shadow border border-outline-variant/20 sticky top-28">
            <h2 className="font-headline font-bold text-sm text-on-surface-variant uppercase tracking-widest mb-6">
              Registration Process
            </h2>
            <div className="flex flex-col gap-3">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;
                const Icon = step.icon;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${isActive
                      ? 'primary-gradient text-white shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : isCompleted ? 'text-secondary' : 'text-on-surface-variant'}`} />
                    <span className="font-medium text-sm">{step.label}</span>
                    {isCompleted && (
                      <ShieldCheck className="w-4 h-4 ml-auto text-secondary fill-secondary/20" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
            <h4 className="text-sm font-bold text-primary font-headline mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Privacy Notice
            </h4>
            <p className="text-xs text-primary/80 leading-relaxed">
              All Aadhaar data is encrypted and processed. We do not store sensitive biometric data on local servers.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 py-8 overflow-y-auto">
          {children}
        </main>
      </div>

     {/* Footer */}
<footer className="bg-surface-container-low border-t border-outline-variant/10 py-10 px-8 mt-auto">
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

    {/* Left Section */}
   <div className="flex flex-col gap-2">

  <span className="text-on-surface-variant font-headline text-lg font-extrabold tracking-tight">
    Ramaiah Memorial Hospital
  </span>

  <span className="text-primary text-xs font-semibold tracking-wide">
    Aadhaar OCR Registration System
  </span>

  <p className="text-on-surface-variant/60 text-[11px] uppercase tracking-widest font-semibold max-w-md">
    © 2026 Ramaiah Memorial Hospital. All medical data is processed securely.
  </p>

</div>

    {/* Right Section */}
    <div className="flex gap-8">
      {["Privacy Policy", "Support", "Terms of Service"].map((link) => (
        <a
          key={link}
          href="#"
          className="text-on-surface-variant/60 hover:text-primary transition-all text-[11px] uppercase tracking-widest font-semibold"
        >
          {link}
        </a>
      ))}
    </div>

  </div>
</footer>
</div>
  );
}