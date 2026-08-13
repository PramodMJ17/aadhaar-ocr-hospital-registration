import React, { useEffect, useState } from 'react';
import { Activity, ClipboardList, Users, CheckCircle2, Clock3, UserPlus, UserCheck, Calendar } from 'lucide-react';

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

function maskAadhaar(aadhaar) {
  if (!aadhaar) return "";
  const cleaned = aadhaar.toString().replace(/\D/g, "");
  if (cleaned.length >= 4) {
    return `XXXX XXXX ${cleaned.slice(-4)}`;
  }
  return aadhaar;
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
      subtext: 'Registered in database',
      icon: Users,
      accent: 'bg-blue-50 text-blue-600 border-blue-100',
      badge: 'bg-blue-100/80 text-blue-700',
    },
    {
      label: 'New Patients',
      value: stats.newPatients,
      subtext: 'First-time admissions',
      icon: UserPlus,
      accent: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      badge: 'bg-emerald-100/80 text-emerald-700',
    },
    {
      label: 'Existing Patients',
      value: stats.existingPatients,
      subtext: 'Returning hospital records',
      icon: UserCheck,
      accent: 'bg-purple-50 text-purple-600 border-purple-100',
      badge: 'bg-purple-100/80 text-purple-700',
    },
    {
      label: "Today's Registrations",
      value: stats.todaysRegistrations,
      subtext: 'Admitted today',
      icon: Calendar,
      accent: 'bg-sky-50 text-sky-600 border-sky-100',
      badge: 'bg-sky-100/80 text-sky-700',
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Overview Header & Statistics Grid */}
      <section className="space-y-6">
        <div className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-blue-600 font-bold">Hospital Admin Dashboard</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Patient Registration Overview</h1>
              <p className="mt-2 text-sm text-gray-500 max-w-2xl leading-relaxed">
                Monitor registration flow, track daily admissions, and access recent Aadhaar registrations from one responsive control panel.
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3.5 text-blue-600 border border-blue-100 shadow-sm flex items-center gap-2 text-sm font-semibold self-start md:self-auto">
              <Clock3 className="w-5 h-5" />
              <span>Real-time Sync</span>
            </div>
          </div>
        </div>

        {/* 4 Prominent Stat Cards */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                    {card.label}
                  </span>
                  <div className={`rounded-xl p-2.5 border ${card.accent} transition-transform group-hover:scale-110 duration-200`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    {card.value}
                  </p>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${card.badge}`}>
                    Live
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500 font-medium">
                  {card.subtext}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Registrations Section */}
      <section className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-blue-600 font-bold">Recent Registrations</p>
            <h2 className="mt-1 text-2xl font-extrabold text-gray-900">Latest aadhaar patients</h2>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
          >
            <Activity className="w-4 h-4 text-blue-600" />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500 font-medium">Loading dashboard data…</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 font-medium">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200/80 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-blue-800/40">Patient Name</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Aadhaar Number</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Registered At</th>
                  <th className="px-6 py-4 border-b border-blue-800/40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70 text-sm text-gray-700">
                {stats.recentRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500 bg-gray-50/30">
                      No recent registrations yet.
                    </td>
                  </tr>
                ) : stats.recentRegistrations.map((patient, index) => (
                  <tr
                    key={patient.id}
                    className={`transition-colors hover:bg-blue-50/60 ${index % 2 === 0 ? "bg-white" : "bg-blue-50/20"}`}
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">{patient.fullName}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{maskAadhaar(patient.aadhaarNumber)}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDateTime(patient.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${patient.status === 'New'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        }`}>
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
