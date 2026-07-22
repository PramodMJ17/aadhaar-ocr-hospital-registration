import React, { useEffect, useState } from 'react';
import { Activity, ClipboardList, Users, CheckCircle2, Clock3 } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Dashboard({ token, onError }) {
  const [stats, setStats] = useState({
    totalPatients: 0,
    todaysRegistrations: 0,
    existingPatients: 0,
    newPatients: 0,
    recentRegistrations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load dashboard data.');
        }

        setStats({
          totalPatients: data.totalPatients ?? 0,
          todaysRegistrations: data.todaysRegistrations ?? 0,
          existingPatients: data.existingPatients ?? 0,
          newPatients: data.newPatients ?? 0,
          recentRegistrations: data.recentRegistrations ?? [],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Dashboard fetch failed.';
        setError(message);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [token, onError]);

  const cards = [
    {
      label: 'Total Patients',
      value: stats.totalPatients,
      icon: Users,
      accent: 'bg-primary/10 text-primary',
    },
    {
      label: "Today's Registrations",
      value: stats.todaysRegistrations,
      icon: Activity,
      accent: 'bg-secondary/10 text-secondary',
    },
    {
      label: 'Existing Patients',
      value: stats.existingPatients,
      icon: ClipboardList,
      accent: 'bg-surface-container-low text-on-surface',
    },
    {
      label: 'New Patients',
      value: stats.newPatients,
      icon: CheckCircle2,
      accent: 'bg-success-gradient/10 text-success-gradient',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start">
        <div className="rounded-[32px] bg-white border border-outline-variant/10 p-8 shadow-[0_20px_60px_rgba(0,71,141,0.08)]">
          <div className="flex items-center justify-between gap-6 mb-8">
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-on-surface-variant font-semibold">Hospital Admin Dashboard</p>
              <h1 className="mt-3 text-3xl font-extrabold text-on-surface">Patient Registration Overview</h1>
              <p className="mt-3 text-sm text-on-surface-variant max-w-xl leading-relaxed">
                Monitor registration flow, track daily admissions, and access recent Aadhaar registrations from one responsive control panel.
              </p>
            </div>
            <div className="rounded-3xl bg-primary/5 p-4 text-primary shadow-lg shadow-primary/10">
              <Clock3 className="w-8 h-8" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-[28px] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant font-semibold">{card.label}</p>
                      <p className="mt-3 text-3xl font-extrabold text-on-surface">{card.value}</p>
                    </div>
                    <div className={`rounded-3xl p-3 ${card.accent}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant">Updated live from hospital admissions data.</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[32px] bg-primary/5 p-8 shadow-[0_20px_45px_rgba(0,71,141,0.08)] border border-primary/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-3xl bg-primary text-white p-3">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/80 font-semibold">Staff Snapshot</p>
              <h2 className="text-2xl font-extrabold text-white mt-2">Operational insight</h2>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/85">
            The admin dashboard is designed to support quick hospital workflows without altering existing Aadhaar OCR or registration screens. Use the Registration tab to continue processing patient documents.
          </p>
        </div>
      </section>

      <section className="rounded-[32px] bg-white border border-outline-variant/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-on-surface-variant font-semibold">Recent Registrations</p>
            <h2 className="mt-2 text-2xl font-extrabold text-on-surface">Latest aadhaar patients</h2>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant/60 px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-all"
          >
            <Activity className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-dashed border-outline-variant/70 p-10 text-center text-on-surface-variant">Loading dashboard data…</div>
        ) : error ? (
          <div className="rounded-3xl border border-error-container bg-error-container/10 p-8 text-sm text-on-error-container">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.28em] text-on-surface-variant">
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Aadhaar Number</th>
                  <th className="px-4 py-3">Registered At</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-sm text-on-surface-variant">
                      No recent registrations yet.
                    </td>
                  </tr>
                ) : stats.recentRegistrations.map((patient) => (
                  <tr key={patient.id} className="border border-outline-variant/10 rounded-[28px] bg-surface-container-lowest">
                    <td className="px-4 py-4 text-sm font-medium text-on-surface">{patient.fullName}</td>
                    <td className="px-4 py-4 text-sm text-on-surface-variant">{patient.aadhaarNumber}</td>
                    <td className="px-4 py-4 text-sm text-on-surface-variant">{formatDateTime(patient.createdAt)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${patient.status === 'New' ? 'bg-success-gradient/10 text-success-gradient' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                        {patient.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
