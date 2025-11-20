// src/pages/SubscriptionPage.jsx
import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Lock, XCircle, Loader, IndianRupee, Zap, Clock, TrendingUp, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { FaCalendarAlt, FaHistory, FaChevronDown, FaChevronUp, FaLock, FaCheck, FaTimes } from "react-icons/fa";

// --- Helper Component: Plan Card (Redesigned for premium dark theme) ---
const PlanCard = ({ plan, index, prevPlan, getDiscountNote, handleChoose }) => {
    const discountNote = getDiscountNote(plan, prevPlan);
    // Determine the highest value plan for the Teal accent
    const isBest = plan.highlight === "Best Value";
    const isPopular = plan.highlight === "Popular";

    // Define classes for Dark Theme consistency
    const cardStyle = isBest ? {
        bg: "bg-teal-900/40 border-teal-500/50 hover:border-teal-500",
        tag: "bg-teal-600 shadow-lg shadow-teal-500/30",
        price: "text-teal-400",
        button: "bg-teal-500 text-gray-900 hover:bg-teal-400 shadow-lg shadow-teal-500/40",
    } : isPopular ? {
        bg: "bg-indigo-900/40 border-indigo-500/50 hover:border-indigo-500",
        tag: "bg-indigo-600 shadow-lg shadow-indigo-600/30",
        price: "text-indigo-400",
        button: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/40",
    } : {
        bg: "bg-gray-800/50 border-gray-700 hover:border-gray-500",
        tag: "bg-gray-600",
        price: "text-gray-300",
        button: "bg-gray-600 text-white hover:bg-gray-700",
    };

    return (
        <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
            whileHover={{ scale: 1.03, boxShadow: "0 15px 30px rgba(0,0,0,0.5)" }}
            className={`relative flex flex-col p-8 rounded-2xl border-2 shadow-2xl backdrop-blur-sm overflow-hidden transition duration-300 ${cardStyle.bg} h-full`}
        >
            {/* Highlight Tag */}
            {(isBest || isPopular) && (
                <div
                    className={`absolute top-6 right-0 py-1 px-10 -mr-10 rotate-45 text-white text-sm font-bold tracking-wider ${cardStyle.tag}`}
                >
                    {plan.highlight}
                </div>
            )}

            {/* Pricing Details */}
            <div className="mb-6 text-center">
                <h4 className="text-3xl font-extrabold text-white tracking-tight">{plan.name}</h4>
                <p className={`mt-4 text-6xl font-black ${cardStyle.price} flex items-center justify-center`}>
                    <IndianRupee className="w-10 h-10 mr-1 inline" />
                    {plan.price}
                    <span className="text-xl font-light text-gray-400 ml-2"> / {plan.durationDays} days</span>
                </p>
                {discountNote && (
                    <p className="mt-4 text-sm font-bold text-green-400 flex items-center justify-center gap-1">
                        <Zap className="w-4 h-4" /> {discountNote}
                    </p>
                )}
            </div>

            {/* Features (Flex Grow) */}
            <div className="flex-grow border-t border-gray-700 pt-6">
                <ul className="space-y-3 text-gray-300 text-left">
                    <li className="flex items-center gap-3 font-medium">
                        <FaCheck className="text-teal-400 w-4 h-4 flex-shrink-0" /> Full Dashboard Access
                    </li>
                    <li className="flex items-center gap-3 font-medium">
                        <FaCheck className="text-teal-400 w-4 h-4 flex-shrink-0" /> Custom Module Support
                    </li>
                    {plan.durationDays >= 180 ? (
                        <li className="flex items-center gap-3 font-medium text-purple-400">
                            <FaCheck className="text-purple-400 w-4 h-4 flex-shrink-0" /> Dedicated Priority Support
                        </li>
                    ) : (
                        <li className="flex items-center gap-3 text-gray-500">
                            <FaTimes className="w-4 h-4 flex-shrink-0" /> Priority Support (Add-on)
                        </li>
                    )}
                    <li className="flex items-center gap-3 text-gray-500">
                        <FaTimes className="w-4 h-4 flex-shrink-0" /> Custom Query Upload (Admin Only)
                    </li>
                </ul>
            </div>

            {/* Button */}
            <button
                onClick={() => handleChoose(plan)}
                className={`mt-10 w-full py-3.5 px-4 rounded-xl font-extrabold text-lg transition ${cardStyle.button}`}
            >
                Start Subscription
            </button>

            <div className="flex items-center justify-center mt-3 text-xs text-gray-500">
                <FaLock className="w-3 h-3 mr-1" /> 100% Secure Payment via Razorpay
            </div>
        </motion.div>
    );
};


export default function SubscriptionPage() {
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const navigate = useNavigate();

    // Removed direct user parsing here as it's handled in handleChoose for security

    // --- Data Fetching ---
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
            try {
                const subRes = await api.get("/user/subscription-status");
                setSubscriptionStatus(subRes.data);
            } catch (err) {
                console.error("Failed to fetch subscription status", err);
                setSubscriptionStatus({ hasActivePlan: false, activePlans: [] });
            }
        };

        fetchPlans();
        fetchStatus();
    }, []);
    
    // Logic Preserved
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

    // Custom Toasts adapted to dark theme success/error concept (logic preserved)
    const showSuccessToast = () => {
        toast.custom(
            (t) => (
                <div
                    className={`transition-opacity duration-300 ${t.visible ? "opacity-100" : "opacity-0"} max-w-md w-full bg-gray-800 shadow-2xl rounded-lg pointer-events-auto flex ring-1 ring-white/10 border-l-4 border-green-500`}
                >
                    <div className="flex-1 w-0 p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <CheckCircle2 className="h-6 w-6 text-green-400" />
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-white">
                                    Payment Verified Successfully
                                </p>
                                <p className="mt-1 text-sm text-gray-400">
                                    Your subscription is now active. Check your Purchase History for the invoice.
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
                    className={`transition-opacity duration-300 ${t.visible ? "opacity-100" : "opacity-0"} max-w-md w-full bg-gray-800 shadow-2xl rounded-lg pointer-events-auto flex ring-1 ring-white/10 border-l-4 border-red-500`}
                >
                    <div className="flex-1 w-0 p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <XCircle className="h-6 w-6 text-red-400" />
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-white">
                                    Payment Verification Failed
                                </p>
                                <p className="mt-1 text-sm text-gray-400">
                                    We couldn’t verify your payment. Please try again or contact support.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            { duration: 8000 }
        );
    };

    // Payment/Auth Logic Preserved
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

    const handleChoose = async (plan) => {
        let user = null;
        try {
            const storedUser = localStorage.getItem("user");
            user = storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            console.error("Error parsing user from localStorage:", error);
            user = null;
        }

        if (!user) {
            try {
                await api.get("/user/subscription-status");
            } catch (err) {
                toast.error("⚠️ Please log in to subscribe to a plan.");
                navigate("/login", { state: { from: "/subscription/buy" } });
                return;
            }
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
                name: "NGraph",
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
                        // Refresh data after successful verification
                        const subRes = await api.get("/user/subscription-status");
                        setSubscriptionStatus(subRes.data);
                        
                        setTimeout(() => setVerifying(false), 500);
                    } catch (verifyErr) {
                        console.error("Verification failed", verifyErr);
                        showErrorToast();
                        setTimeout(() => setVerifying(false), 500);
                    }
                },
                theme: { color: "#4c1d95" }, // Adjusted theme color to Indigo
            };

            new window.Razorpay(options).open();
        } catch (err) {
            console.error("Error in handleChoose", err);
            toast.error("Failed to start payment");
        }
    };


    // --- Data Filtering for Display (Logic Preserved) ---
    const allPlans = subscriptionStatus?.activePlans || [];

    // Filter currently active plans (remainingDays > 0)
    const activePlansFiltered = allPlans.filter(p => p.remainingDays > 0);
    const hasVisibleActivePlans = activePlansFiltered.length > 0;

    // Separate future and expired plans for history
    const now = new Date().getTime();
    const futurePlans = allPlans.filter(p => new Date(p.subscriptionStart).getTime() > now);
    const expiredPlans = allPlans.filter(p => p.remainingDays <= 0 && new Date(p.subscriptionEnd).getTime() < now);


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030712]">
                <div className="text-xl text-teal-400 font-medium flex items-center gap-2">
                    <Loader className="animate-spin w-6 h-6" /> Loading Premium Plans...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030712] text-white py-12 px-4 sm:px-6 lg:px-8">

            {/* --- Page Header --- */}
            <div className="max-w-6xl mx-auto text-center mb-16">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                    <DollarSign className="inline w-8 h-8 text-teal-400 mr-2" /> Flexible Plans, Transparent Pricing
                </h1>
                <p className="mt-4 text-xl text-gray-400 max-w-3xl mx-auto font-light">
                    Choose a subscription duration that fits your needs. Purchasing longer plans gives you the **best daily value**.
                </p>
            </div>

            {/* --- Plan Grid --- */}
            <div className="max-w-7xl mx-auto grid mb-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {plans.map((plan, index) => {
                    const prevPlan = index > 0 ? plans[index - 1] : null;

                    return (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            index={index}
                            prevPlan={prevPlan}
                            getDiscountNote={getDiscountNote}
                            handleChoose={handleChoose}
                        />
                    );
                })}
            </div>

            {/* Payment Verification Modal (Themed) */}
            <AnimatePresence>
                {verifying && (
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <motion.div
                            className="bg-gray-800 p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4 border border-indigo-500/50"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <svg
                                className="animate-spin h-10 w-10 text-purple-400"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            <span className="text-white font-medium text-lg">Verifying payment, please wait...</span>
                            <p className="text-xs text-gray-500">Do not close this window.</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Active Subscription Status Block (Glassy Dark Theme) --- */}
            {subscriptionStatus?.hasActivePlan && hasVisibleActivePlans && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto mb-16 p-6 sm:p-8 bg-gray-800/70 backdrop-blur-md rounded-2xl shadow-2xl border border-teal-500/50"
                >
                    {/* Summary Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-teal-500/50">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                            <CheckCircle2 className="text-teal-400 w-8 h-8" /> Your Current Active Subscription
                        </h2>
                        <div className="mt-3 sm:mt-0 bg-teal-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-teal-500/30">
                            <span className="text-xl font-extrabold">Total Days Remaining: {subscriptionStatus.totalDaysRemaining}</span>
                        </div>
                    </div>

                    {/* List of Active Plans */}
                    <div className="max-h-64 overflow-y-auto pr-3 custom-scrollbar">
                        <ul className="space-y-4">
                            {activePlansFiltered
                                .sort((a, b) => new Date(a.subscriptionEnd) - new Date(b.subscriptionEnd))
                                .map((plan, idx) => {
                                    const total = plan.totalDays;
                                    const remaining = plan.remainingDays;
                                    const percentElapsed = Math.min((1 - (remaining / total)) * 100, 100);

                                    return (
                                        <li key={idx} className="p-4 rounded-xl bg-gray-900/50 shadow-md border border-teal-600/30">
                                            <div className="flex justify-between text-base font-semibold text-white">
                                                <span className="flex items-center gap-2 text-teal-300">
                                                    <span className="font-bold">{plan.name}</span>
                                                </span>
                                                <span>{remaining} {remaining === 1 ? "day" : "days"} left</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                                                <FaCalendarAlt size={12} className="text-teal-400" /> Ends {new Date(plan.subscriptionEnd).toLocaleDateString()}
                                            </p>
                                            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3">
                                                <div
                                                    className="bg-teal-500 h-2.5 rounded-full transition-all duration-1000"
                                                    style={{ width: `${percentElapsed}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-right text-gray-500 mt-1">Time Elapsed</p>
                                        </li>
                                    );
                                })}
                        </ul>
                    </div>

                    {/* History Toggle */}
                    <div className="mt-8">
                        <button
                            onClick={() => setShowHistory(p => !p)}
                            className="w-full p-3 bg-indigo-700 rounded-xl text-white font-bold flex justify-center items-center gap-2 hover:bg-indigo-800 transition shadow-lg shadow-indigo-600/40"
                        >
                            <FaHistory size={16} /> View Purchase History ({expiredPlans.length + futurePlans.length} records)
                            {showHistory ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                        </button>

                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-4 p-4 bg-gray-900/70 border border-gray-700 rounded-xl shadow-inner space-y-3 max-h-96 overflow-y-auto custom-scrollbar"
                                >
                                    {futurePlans.length > 0 && (
                                        <div className="border-b border-gray-700 pb-2">
                                            <h4 className="font-bold text-sm text-indigo-400">Future Plans ({futurePlans.length})</h4>
                                            {futurePlans.map(p => <p key={p.subscriptionStart} className="text-xs text-gray-400">Starts {new Date(p.subscriptionStart).toLocaleDateString()} - <span className="font-semibold">{p.name}</span></p>)}
                                        </div>
                                    )}
                                    {expiredPlans.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-sm text-red-400">Expired Plans ({expiredPlans.length})</h4>
                                            {expiredPlans.map(p => <p key={p.subscriptionEnd} className="text-xs text-gray-400">Ended {new Date(p.subscriptionEnd).toLocaleDateString()} - <span className="font-semibold">{p.name}</span></p>)}
                                        </div>
                                    )}
                                    {expiredPlans.length === 0 && futurePlans.length === 0 && <p className="text-sm text-gray-500">No expired or future purchase records found.</p>}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </motion.div>
            )}
        </div>
    );
}