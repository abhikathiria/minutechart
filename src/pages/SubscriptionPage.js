// src/pages/SubscriptionPage.jsx
import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Lock, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansRes = await api.get("/dashboard/plan-details");
        setPlans(plansRes.data.sort((a, b) => a.durationDays - b.durationDays));
      } catch (err) {
        console.error("Failed to fetch plans", err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchStatus = async () => {
      if (!user) return;
      try {
        const subRes = await api.get("/user/subscription-status");
        setSubscriptionStatus(subRes.data);
      } catch (err) {
        console.error("Failed to fetch subscription status", err);
      }
    };

    fetchPlans();
    fetchStatus();
  }, [user]);

  const getDiscountNote = (plan, prevPlan) => {
    if (!prevPlan) return null;
    const prevDaily = prevPlan.price / prevPlan.durationDays;
    const planDaily = plan.price / plan.durationDays;
    if (planDaily < prevDaily) {
      const percent = Math.round(((prevDaily - planDaily) / prevDaily) * 100);
      return `Save ${percent}% vs ${prevPlan.name}`;
    }
    return null;
  };


  const showSuccessToast = () => {
    toast.custom(
      (t) => (
        <div
          className={`transition-opacity duration-300 ${t.visible ? "opacity-100" : "opacity-0"} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-green-500`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-black">
                  Payment Verified Successfully
                </p>
                <p className="mt-1 text-sm text-black">
                  Your subscription is now active. An invoice has been emailed and
                  is also available in your Purchase History.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
  };

  const showErrorToast = () => {
    toast.custom(
      (t) => (
        <div
          className={`transition-opacity duration-300 ${t.visible ? "opacity-100" : "opacity-0"} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-red-500`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-black">
                  Payment Verification Failed
                </p>
                <p className="mt-1 text-sm text-black">
                  We couldn’t verify your payment. Please try again or contact
                  support.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
  };

  const handleChoose = async (plan) => {
    if (!user) {
      toast.error("⚠️ Please log in to subscribe to a plan.");
      navigate("/login", { state: { from: "/subscription/buy" } });
      return;
    }

    try {
      const createResp = await api.post("/subscription/create-order", { planId: plan.id });
      const { orderId, amount, currency, key } = createResp.data;

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment SDK");
        return;
      }

      const options = {
        key,
        amount,
        currency,
        name: "minutechart",
        description: `${plan.name} plan`,
        order_id: orderId,
        handler: async (response) => {
          setVerifying(true);
          try {
            await api.post("/subscription/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            showSuccessToast();
            setTimeout(() => setVerifying(false), 500);
          } catch (verifyErr) {
            console.error("Verification failed", verifyErr);
            showErrorToast();
            setTimeout(() => setVerifying(false), 500);
          }
        },
        theme: { color: "#6d28d9" },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      console.error("Error in handleChoose", err);
      toast.error("Failed to start payment");
    }
  };


  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="text-lg text-gray-700 animate-pulse">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-indigo-50 py-16 px-6">

      {/* Active Subscription (if any) */}
      {user && subscriptionStatus?.hasActivePlan && subscriptionStatus.activePlans?.length > 0 && (
        <div className="max-w-4xl mx-auto mb-16 p-8 bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-purple-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Current Subscription</h2>

          {subscriptionStatus.activePlans?.length > 0 && (
            <>
              <ul className="mt-2 space-y-3">
                {subscriptionStatus.activePlans
                  .sort((a, b) => new Date(a.subscriptionEnd) - new Date(b.subscriptionEnd))
                  .map((plan, idx) => {
                    const total = plan.totalDays;
                    const remaining = plan.remainingDays;
                    const percent = Math.min((remaining / total) * 100, 100);

                    return (
                      <li key={idx} className="p-4 rounded-lg bg-purple-50 shadow-sm">
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>
                            <strong>{plan.name}</strong> — ends{" "}
                            {new Date(plan.subscriptionEnd).toLocaleDateString()}
                          </span>
                          <span>{remaining} {remaining === 1 ? "day" : "days"} left</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
              </ul>

              <div className="mt-4 text-right text-gray-700 font-medium">
                Total Remaining: {subscriptionStatus.totalDaysRemaining}{" "}
                {subscriptionStatus.totalDaysRemaining === 1 ? "day" : "days"}
              </div>
            </>
          )}
        </div>
      )}

      {/* Choose Plan Section */}
      <div className="max-w-4xl mx-auto text-center mb-14">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
          Choose Your Perfect Plan
        </h1>
        <p className="mt-5 text-lg text-gray-600">
          Pick a subscription that grows with you. Upgrade anytime with ease.
        </p>
      </div>

      <AnimatePresence>
        {verifying && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/30 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg
                className="animate-spin h-6 w-6 text-purple-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <span className="text-gray-700 font-medium">
                Verifying payment, please wait...
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Plan Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {plans.map((plan, index) => {
          const prevPlan = index > 0 ? plans[index - 1] : null;
          const discountNote = getDiscountNote(plan, prevPlan);
          const isBest = plan.highlight === "Best Value";
          const isPopular = plan.highlight === "Popular Choice";

          return (
            <motion.div
              key={plan.id}
              whileHover={{ scale: 1.03, y: -5 }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`relative flex flex-col p-8 rounded-2xl shadow-lg border overflow-hidden ${isBest
                ? "bg-gradient-to-br from-green-50 to-green-100 border-green-500"
                : isPopular
                  ? "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-500"
                  : "bg-white border-gray-200"
                }`}
            >
              {isBest && (
                <div className="absolute top-6 -right-12 rotate-45 bg-green-600 text-white text-md font-bold px-16 py-1 shadow-md">
                  Best Value
                </div>
              )}
              {isPopular && (
                <div className="absolute top-7 -right-16 rotate-45 bg-purple-600 text-white text-sm font-bold px-16 py-1 shadow-md">
                  Popular Choice
                </div>
              )}

              <div className="mb-6 text-center">
                <h4 className="text-2xl font-semibold text-gray-900">{plan.name}</h4>
                <p className="mt-2 text-4xl font-bold text-gray-800">
                  ₹{plan.price}
                  <span className="text-sm text-gray-500"> / {plan.durationDays} days</span>
                </p>
                {discountNote && (
                  <p className="mt-2 text-sm text-green-600 font-medium">{discountNote}</p>
                )}
              </div>

              <div className="flex-grow">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="text-green-600 w-5 h-5" /> Access to all dashboards
                  </li>
                  {plan.durationDays >= 180 && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-green-600 w-5 h-5" /> Priority Support
                    </li>
                  )}
                </ul>
              </div>

              <button
                onClick={() => handleChoose(plan)}
                className={`mt-8 w-full py-3 px-4 rounded-xl font-semibold shadow-md transition ${isBest
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : isPopular
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
              >
                {isBest ? "Best Value - Get Started" : isPopular ? "Popular Plan - Choose" : "Choose Plan"}
              </button>

              <div className="flex items-center justify-center mt-3 text-xs text-gray-500">
                <Lock className="w-4 h-4 mr-1" /> 100% Secure Payment
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
