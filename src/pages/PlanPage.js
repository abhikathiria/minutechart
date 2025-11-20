import React from "react";
import { useNavigate } from "react-router-dom";

export default function PlanPage({ status }) {
  const navigate = useNavigate();
  const now = new Date();

  const handleRenew = () => {
    navigate("/pricing");
  };

  let message = "Your trial or subscription has expired.";

  if (status?.hasActivePlan) {
    if (status.isTrialActive && status.trialEnd) {
      const trialEnd = new Date(status.trialEnd);
      message = `Your trial is active and will expire on ${trialEnd.toDateString()}.`;
    } else if (status.isPaidSubscriptionActive && status.subscriptionEnd) {
      const subEnd = new Date(status.subscriptionEnd);
      message = `Your subscription is active and will expire on ${subEnd.toDateString()}.`;
    }
  } else {
    if (status.trialEnd) {
      const trialEnd = new Date(status.trialEnd);
      if (trialEnd < now) {
        const expiredDays = Math.floor(
          (now.setHours(0, 0, 0, 0) - trialEnd.setHours(0, 0, 0, 0)) /
            (1000 * 60 * 60 * 24)
        );
        message = `Your trial expired ${expiredDays} day${
          expiredDays > 1 ? "s" : ""
        } ago.`;
      }
    }

    if (status.subscriptionEnd) {
      const subEnd = new Date(status.subscriptionEnd);
      if (subEnd < now) {
        const expiredDays = Math.floor(
          (now.setHours(0, 0, 0, 0) - subEnd.setHours(0, 0, 0, 0)) /
            (1000 * 60 * 60 * 24)
        );
        message = `Your subscription expired ${expiredDays} day${
          expiredDays > 1 ? "s" : ""
        } ago.`;
      }
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-[#071016] text-white">

      {/* Background glow blobs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 w-[40rem] h-[40rem] rounded-full bg-indigo-700/20 blur-[120px] animate-[float_9s_linear_infinite]" />
        <div className="absolute -right-36 -bottom-36 w-[48rem] h-[48rem] rounded-full bg-teal-600/16 blur-[140px] animate-[float_11s_linear_infinite]" />
      </div>

      {/* Card */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-10 rounded-2xl max-w-lg w-full shadow-2xl text-center">
        <h1 className="text-3xl font-bold mb-4 text-white flex items-center justify-center gap-2">
          ⚠️ Subscription Status
        </h1>

        <p className="text-slate-200 mb-8 leading-relaxed">{message}</p>

        {!status?.hasActivePlan && (
          <button
            onClick={handleRenew}
            className="bg-teal-500 hover:bg-teal-600 text-black font-semibold py-3 px-8 rounded-lg transition shadow-lg"
          >
            Renew / Upgrade Plan
          </button>
        )}
      </div>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
          100% { transform: translateY(0px); }
        }
        .animate-[float_9s_linear_infinite] { animation: float 9s linear infinite; }
        .animate-[float_11s_linear_infinite] { animation: float 11s linear infinite; }
      `}</style>
    </div>
  );
}
