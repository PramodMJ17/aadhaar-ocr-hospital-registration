import React, { useEffect, useState } from 'react';
import { UserCheck, Users, Upload, Search, ShieldCheck, ArrowRight, Clock, Award, Building2 } from 'lucide-react';
import { fetchAdminDashboard } from '../services/apiService';

export default function ReceptionDashboard({ user, token, onNavigateRegistration, onNavigateHistory, onError }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchAdminDashboard(token);
        setDashboardData(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load reception desk metrics.';
        setError(msg);
        onError?.(msg);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, [token]);

  const metrics = dashboardData?.metrics || { totalPatients: 0, newPatients: 0, existingPatients: 0 };
  const recentPatients = dashboardData?.recentRegistrations || [];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header Banner */}
      <section className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-2xl font-headline border border-emerald-200/60 shadow-inner">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-bold">Front Desk Workstation</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Desk Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-headline mt-1">
                Welcome, {user?.name || user?.username || 'Receptionist'}
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Hospital Intake Desk • Patient Aadhaar OCR Registration & Directory Access.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={onNavigateRegistration}
              className="inline-flex items-center justify-center gap-2 primary-gradient text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" />
              New Patient Registration
            </button>

            <button
              type="button"
              onClick={onNavigateHistory}
              className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-3 rounded-2xl font-bold text-xs shadow-xs transition-all"
            >
              <Search className="w-4 h-4 text-gray-600" />
              Patient Directory
            </button>
          </div>
        </div>
      </section>

      {/* Reception Desk Metrics */}
      <section className="grid gap-5 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Total Patient Records</span>
            <div className="rounded-xl p-2.5 bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 tracking-tight font-headline">{metrics.totalPatients}</p>
          <p className="mt-2 text-xs text-gray-500 font-medium">Registered in hospital database</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Today's Registrations</span>
            <div className="rounded-xl p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-900 tracking-tight font-headline">{metrics.newPatients}</p>
          <p className="mt-2 text-xs text-emerald-600 font-medium">New patient intakes today</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Existing Intakes</span>
            <div className="rounded-xl p-2.5 bg-purple-50 text-purple-600 border border-purple-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-900 tracking-tight font-headline">{metrics.existingPatients}</p>
          <p className="mt-2 text-xs text-purple-600 font-medium">Prior hospital records</p>
        </div>
      </section>

      {/* Recent Registrations Queue */}
      <section className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-700 font-bold">Front Desk Intake Queue</p>
            <h2 className="mt-1 text-2xl font-extrabold text-gray-900 font-headline">Recent Patient Registrations</h2>
          </div>
          <button
            type="button"
            onClick={onNavigateHistory}
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            View Full Patient Directory <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm font-medium">Loading recent registrations…</div>
        ) : recentPatients.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-xs">
            No patient registrations recorded yet today.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200/80 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-emerald-800/40">Patient ID</th>
                  <th className="px-6 py-4 border-b border-emerald-800/40">Patient Name</th>
                  <th className="px-6 py-4 border-b border-emerald-800/40">Registration Time</th>
                  <th className="px-6 py-4 border-b border-emerald-800/40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70 text-sm text-gray-700">
                {recentPatients.map((pt, idx) => (
                  <tr key={pt.id} className={`transition-colors hover:bg-emerald-50/40 ${idx % 2 === 0 ? "bg-white" : "bg-emerald-50/10"}`}>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-950">{pt.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{pt.fullName}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(pt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Intake
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
