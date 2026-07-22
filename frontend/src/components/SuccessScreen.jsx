import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ArrowRight, FileText, ShieldCheck } from 'lucide-react';

export default function SuccessScreen({ data, result, onReset, onViewData }) {
  console.log("SuccessScreen rendered", result);

  const title = result?.success
    ? result.existing
      ? 'Existing Patient Found'
      : 'New Patient Registered Successfully'
    : 'Details Verified Successfully';
    console.log("Title =", title);
    console.log("Result =", result);
    console.log("result.existing =", result?.existing);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[500px] w-full pt-8 pb-12"
    >
      <div className="bg-surface-container-lowest rounded-3xl p-8 md:p-12 ambient-shadow max-w-2xl w-full text-center flex flex-col items-center gap-8 relative overflow-hidden border border-outline-variant/10">
        {/* Decorative Gradients */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>

        {/* Icon Container */}
        <div className="w-24 h-24 rounded-full success-gradient flex items-center justify-center shadow-xl shadow-secondary/20 relative z-10">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
{/* Textual Content */}
<div className="space-y-6 relative z-10 text-center w-full">

  <h1
    className="text-5xl font-extrabold tracking-tight"
    style={{
      color: result?.existing ? "#dc2626" : "#16a34a",
    }}
  >
    {title}
  </h1>

  <p className="text-lg text-gray-600">
    {result?.existing
      ? "Patient already exists in the hospital database."
      : "Patient has been registered successfully in the hospital database."}
  </p>

  {/* Status Badge */}
  <div className="flex justify-center">
    <span
      className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-white font-semibold shadow-md ${
        result?.existing ? "bg-red-500" : "bg-green-500"
      }`}
    >
      <CheckCircle2 className="w-4 h-4" />
      {result?.existing ? "Existing Patient" : "New Patient"}
    </span>
  </div>

  {/* Registration ID */}
  <div className="max-w-xl mx-auto">

    <p className="text-sm font-semibold text-gray-600 mb-2">
      Hospital Registration ID
    </p>

    <div className="bg-gray-100 border rounded-xl px-5 py-3 shadow-sm font-mono text-sm break-all">
      {result?.patient?.hospitalId || "N/A"}
    </div>

  </div>

  {/* Registration Time */}
  <div className="text-gray-500 text-sm">
    🕒 Registered on
    <br />
    {new Date().toLocaleString()}
  </div>

</div>

{/* Final Data Display Card */}
{data && (
  <div className="bg-surface-container-low rounded-2xl p-6 w-full text-left relative z-10 border border-outline-variant/20 shadow-sm">

    <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/20">
      <span className="font-headline font-bold text-primary">
        Patient Profile
      </span>

     <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant/60 font-bold bg-surface-container-highest px-3 py-1 rounded-full">
  ID: #{result?.patient?.hospitalId}
</span>
    </div>

    {/* Patient Type Badge */}
    <div className="mb-5">
      <span
        className={`px-3 py-1 rounded-full text-sm font-semibold ${
          result?.existing
            ? "bg-red-100 text-red-700"
            : "bg-green-100 text-green-700"
        }`}
      >
        {result?.existing
          ? "Existing Hospital Record"
          : "Newly Registered"}
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">

      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold mb-1">
          Full Name
        </span>
        <span className="font-headline font-semibold text-on-surface">
          {data.fullName || "N/A"}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold mb-1">
          Aadhaar Number
        </span>
        <span className="font-headline font-semibold text-on-surface">
          {data.aadhaarNumber || "N/A"}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold mb-1">
          Date of Birth
        </span>
        <span className="font-headline font-semibold text-on-surface">
          {data.dob || "N/A"}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold mb-1">
          Gender
        </span>
        <span className="font-headline font-semibold text-on-surface">
          {data.gender || "N/A"}
        </span>
      </div>

      <div className="flex flex-col sm:col-span-2 mt-2">
        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold mb-1">
          Registered Address
        </span>

        <span className="font-medium text-on-surface leading-tight text-sm">
          {data.address || "N/A"}
        </span>
      </div>

    </div>

  </div>
)}

{/* Primary Action */}
<div className="w-full flex flex-col md:flex-row gap-4 pt-4 relative z-10">

  <button
    type="button"
    onClick={() => {
      console.log("Register New Patient clicked");
      onReset();
    }}
    className="flex-1 primary-gradient text-white font-headline font-bold py-4 px-10 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-150 text-lg flex items-center justify-center gap-2"
  >
    Register New Patient
    <ArrowRight className="w-5 h-5" />
  </button>

</div>

{/* CLOSE THE MAIN CARD */}
</div>

{/* CLOSE motion.div */}
</motion.div>

);
}