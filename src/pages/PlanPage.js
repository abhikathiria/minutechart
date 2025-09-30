import React from "react";
import { useNavigate } from "react-router-dom";

export default function PlanPage({ status }) {
  const navigate = useNavigate();
  const now = new Date();

  const handleRenew = () => {
    navigate("/subscription/buy");
  };

  let message = "Your trial or subscription has expired.";

  if (status?.hasActivePlan) {
    if (status.isTrialActive && status.trialEnd) {
      const trialEnd = new Date(status.trialEnd);
      message = `✅ Your trial is active and will expire on ${trialEnd.toDateString()}.`;
    } else if (status.isPaidSubscriptionActive && status.subscriptionEnd) {
      const subEnd = new Date(status.subscriptionEnd);
      message = `✅ Your subscription is active and will expire on ${subEnd.toDateString()}.`;
    }
  } else {
    if (status.trialEnd) {
      const trialEnd = new Date(status.trialEnd);
      if (trialEnd < now) {
        const expiredDays = Math.floor(
          (now.setHours(0, 0, 0, 0) - trialEnd.setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
        );
        message = `Your trial expired ${expiredDays} day${expiredDays > 1 ? "s" : ""} ago.`;
      }
    }

    if (status.subscriptionEnd) {
      const subEnd = new Date(status.subscriptionEnd);
      if (subEnd < now) {
        const expiredDays = Math.floor(
          (now.setHours(0, 0, 0, 0) - subEnd.setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
        );
        message = `Your subscription expired ${expiredDays} day${expiredDays > 1 ? "s" : ""} ago.`;
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          ⚠️ Subscription Status
        </h1>
        <p className="text-gray-600 mb-6">{message}</p>
        {!status?.hasActivePlan && (
          <button
            onClick={handleRenew}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            Renew / Upgrade Plan
          </button>
        )}
      </div>
    </div>
  );
}
