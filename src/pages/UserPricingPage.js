import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronDown, Rocket, Zap, Shield, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { FaTimes, FaArrowRight, FaSpinner } from "react-icons/fa";

// --- Component Definitions (PricingButton, FeatureCell, FAQ remain the same) ---

const PricingButton = ({ children, variant = "default", onClick, className = '' }) => {
    const base = "w-full py-3 rounded-xl font-extrabold transition-all duration-200 shadow-lg active:scale-[0.98] text-base whitespace-nowrap";
    let styles;

    if (variant === "primary") {
        styles = "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/50";
    } else if (variant === "ask") {
        styles = "bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50 shadow-md";
    } else {
        styles = "bg-green-500 text-white hover:bg-green-600 shadow-green-500/50";
    }

    return (
        <motion.button
            onClick={onClick}
            className={`${base} ${styles} ${className}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {children}
        </motion.button>
    );
};

const FeatureCell = ({ value, plan, type, featureKey }) => {
    const textStyles = "font-extrabold text-indigo-700 text-sm md:text-base";
    const iconStyles = "w-6 h-6";

    // Handle the custom "addon" type from your original logic
    if (type === "addon") {
        if (plan.dashboardAddonEnabled) {
            if (plan.addonPrice === "Custom") {
                return <span className={`text-sm font-semibold text-indigo-600 ${textStyles}`}>Available</span>;
            }
            // Uses your original pricing variables
            return (
                <span className="text-sm font-semibold text-green-600">
                    +{plan.addonDashboards} @ ₹{plan.addonPrice}/mo
                </span>
            );
        } else {
            return <X className={`${iconStyles} text-red-500`} />;
        }
    }

    // Handle boolean values
    if (typeof value === "boolean") {
        return value ? (
            <Check className={`${iconStyles} text-green-500`} />
        ) : (
            <X className={`${iconStyles} text-red-500`} />
        );
    }

    // Handle string/number values
    return <span className={textStyles}>{value}</span>;
};

function FAQ({ q, a }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-200 py-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <HelpCircle className="w-5 h-5 text-indigo-500 mr-3 hidden sm:inline" />
                    {q}
                </h3>
                <ChevronDown className={`w-6 h-6 text-indigo-500 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </div>
            <motion.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
            >
                <p className="mt-3 text-gray-600 pl-8 text-sm leading-relaxed">{a}</p>
            </motion.div>
        </div>
    );
}

// --- Main Application Component ---

export default function PricingPage() {
    const [plans, setPlans] = useState([]);
    const [isAnnual, setIsAnnual] = useState(false); // Set to false to match the screenshot's initial state
    const [loading, setLoading] = useState(true);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const navigate = useNavigate();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // This relies on the api utility imported from "../api"
            const res = await api.get("/pricing");
            // Optional: Sort plans if the API doesn't guarantee a specific order
            setPlans(res.data);
        } catch (error) {
            console.error("Failed to fetch pricing plans:", error);
            // Handle error state gracefully
            setPlans([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) return resolve(true);
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleBuy = async (plan) => {
        try {
            // 1. Ensure user is logged in
            let subscription;
            try {
                const sub = await api.get("/user/subscription-status");
                subscription = sub.data;
                setSubscriptionStatus(subscription);
            } catch {
                toast.error("Please log in to continue");
                navigate("/login", { state: { from: "/pricing" } });
                return;
            }

            // ----------------------------
            // 2. DETERMINE PURCHASE INTENT
            // ----------------------------

            let intent = "purchase"; // default
            const newTier = plan.tierOrder;

            const isTrialActive = subscription.isTrialActive;
            const isPaidActive = subscription.isPaidActive;
            const currentTier = subscription.currentTierOrder ?? 0;

            if (isTrialActive) {
                // CASE: User on free trial
                if (newTier > currentTier) intent = "upgrade_immediate";
                else intent = "upgrade_queued";
            }
            else if (isPaidActive) {
                // CASE: User already has a paid plan
                if (newTier > currentTier) intent = "upgrade_immediate";
                else if (newTier === currentTier) intent = "upgrade_queued";
                else intent = "upgrade_queued"; // downgrades scheduled too
            }
            else {
                // No trial, no paid plan → normal purchase
                intent = "purchase";
            }

            console.log("Calculated intent:", intent);

            // 3. Create Razorpay order with correct INTENT
            const res = await api.post("/plan/create-order", {
                planId: plan.id,
                billingCycle: isAnnual ? "annual" : "monthly",
                intent
            });

            const { orderId, amount, currency, key } = res.data;

            // 4. Load Razorpay
            const loaded = await loadRazorpay();
            if (!loaded) {
                toast.error("Failed to load payment gateway");
                return;
            }

            // 5. Open Razorpay modal
            const options = {
                key,
                amount: amount * 100,
                currency,
                name: "minutechart",
                description: plan.name + " Plan",
                order_id: orderId,
                handler: async function (response) {
                    setIsVerifying(true);

                    try {
                        await api.post("/plan/verify", {
                            orderId: response.razorpay_order_id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                        });

                        toast.success("Payment successful!");

                        // refresh subscription state
                        const sub = await api.get("/user/subscription-status");
                        setSubscriptionStatus(sub.data);

                    } catch (err) {
                        console.error(err);
                        toast.error("Payment verification failed");
                    } finally {
                        setTimeout(() => setIsVerifying(false), 500);
                    }
                },
                theme: { color: "#4f46e5" },
            };

            new window.Razorpay(options).open();

        } catch (err) {
            console.error(err);
            toast.error("Failed to start payment");
        }
    };


    const calculateSavings = (plan) => {
        if (typeof plan.monthlyPrice !== 'number' || typeof plan.annualPrice !== 'number') return 0;

        const yearlyIfMonthly = plan.monthlyPrice * 12;
        const savings = yearlyIfMonthly - plan.annualPrice;
        return savings > 0 ? savings : 0;
    };

    const formatPrice = (plan) => {
        // Assuming plans with non-numeric prices are "Custom"
        const isCustom = typeof plan.monthlyPrice !== 'number';

        if (isCustom) {
            return (
                <div className="flex flex-col items-center py-4">
                    <span className="text-4xl font-extrabold text-gray-900">Contact Us</span>
                    <span className="text-sm text-gray-500 mt-1">For tailor-made solutions</span>
                </div>
            );
        }

        const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
        const period = isAnnual ? 'yr' : 'mo';
        const savings = calculateSavings(plan);

        return (
            <div className="flex flex-col items-center py-4">
                <span className="text-5xl font-extrabold text-gray-900 flex items-end">
                    <span className="text-xl mr-1 font-semibold text-gray-600">₹</span>
                    {price}
                    <span className="text-lg text-gray-500 ml-1">/{period}</span>
                </span>
                {isAnnual && savings > 0 && (
                    <motion.span
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-semibold text-green-600 mt-2 p-1 bg-green-50 rounded-lg"
                    >
                        Save ₹{savings} per year
                    </motion.span>
                )}
                {!isAnnual && <span className="text-xs text-gray-500 mt-2 invisible">Placeholder</span>}
            </div>
        );
    };

    // NOTE: These feature groups assume keys like 'dashboardLimit' exist in your API response.
    const featureGroups = [
        {
            icon: <Rocket className="w-5 h-5 mr-3 text-indigo-600" />,
            title: "Core Infrastructure",
            features: [
                { label: "Dashboard Limit", key: "dashboardLimit" },
                { label: "Refresh Rate (Minutes)", key: "refreshRateMinutes" },
            ],
        },
        {
            icon: <Zap className="w-5 h-5 mr-3 text-indigo-600" />,
            title: "Advanced Capabilities",
            features: [
                { label: "Excel Export", key: "excelExport" },
                { label: "Dashboard Add-ons", key: "dashboardAddonEnabled", type: "addon" },
            ],
        },
        {
            icon: <Shield className="w-5 h-5 mr-3 text-indigo-600" />,
            title: "Support",
            features: [
                { label: "Priority Support", key: "prioritySupport" },
            ],
        },
    ];

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
                <div className="text-lg text-white flex items-center gap-2 p-6 bg-[#0a2345] rounded-2xl shadow-lg">
                    <Loader2 className="animate-spin w-6 h-6" /> Loading Plans...
                </div>
            </div>
        );
    }

    // Determine the index of the "Pro" plan (assuming it's named 'Pro' and is the popular one)
    const proPlanIndex = plans.findIndex(p => p.name === 'Pro');

    // Grid template column for the comparison table: 1 column for features + N columns for plans
    const gridTemplate = `250px repeat(${plans.length}, 1fr)`;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* --- Hero Section --- */}
            <div className="relative z-0 pt-20 pb-40" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)" }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
                        <h1 className="text-5xl md:text-6xl font-extrabold text-white text-center">
                            Transparent Pricing. Unmatched Value.
                        </h1>
                        <p className="text-indigo-200 max-w-3xl mx-auto mt-4 text-xl text-center">
                            Select the perfect dashboarding solution tailored to your business scale and speed requirements.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="relative z-10 -mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* --- Pricing Table Container --- */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <div style={{ gridTemplateColumns: gridTemplate }} className="min-w-[700px] md:min-w-full">

                            {/* Table Header: Plans & Toggle */}
                            <div style={{ gridTemplateColumns: gridTemplate }} className="grid text-center divide-x border-b border-gray-100">

                                {/* --- CORRECTED: Pricing Toggle placed inside the first column header cell (top-left) --- */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                    className="flex justify-center items-center p-6" // Use p-6 padding for visual height match
                                >
                                    <div className="flex p-1 bg-white border border-gray-200 rounded-full shadow-xl relative">
                                        {/* Background Pill for Selected State */}
                                        <motion.div
                                            className="absolute top-1 bottom-1 left-1 rounded-full bg-indigo-600 shadow-md shadow-indigo-300"
                                            initial={false}
                                            animate={{ x: isAnnual ? '100%' : '0%', width: '50%' }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />

                                        <button
                                            onClick={() => setIsAnnual(false)}
                                            className={`px-6 py-2 text-sm md:text-base font-semibold rounded-full transition-colors relative z-10 ${!isAnnual ? "text-white" : "text-black"}`}
                                        >
                                            Monthly
                                        </button>
                                        <button
                                            onClick={() => setIsAnnual(true)}
                                            className={`px-6 py-2 text-sm md:text-base font-semibold rounded-full transition-colors relative z-10 ${isAnnual ? "text-white" : "text-black"}`}
                                        >
                                            Annually
                                            {/* <span className="absolute -top-3 right-0 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full rotate-3 shadow-lg hidden sm:inline-block">
                                                4 Months FREE
                                            </span> */}
                                        </button>
                                    </div>
                                </motion.div>

                                {/* Plan Cards (start from the second column) */}
                                {plans.map((p, index) => (
                                    <div key={p.id} className={`p-6 ${index === proPlanIndex ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-gray-100'} relative`}>
                                        {index === proPlanIndex && (
                                            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                                MOST POPULAR
                                            </div>
                                        )}
                                        <h3 className="text-2xl font-extrabold text-gray-900">{p.name}</h3>
                                        {/* Tagline is assumed to be a property of the plan: p.tagline */}
                                        {/* <p className="text-sm text-gray-500 mb-4">{p.tagline || 'Essential data insights'}</p> */}
                                        {formatPrice(p)}
                                        <div>
                                            <PricingButton
                                                variant={index === proPlanIndex ? "primary" : p.name === 'Enterprise' ? "ask" : "default"}
                                                className="mt-2 text-sm"
                                                onClick={() => handleBuy(p)}
                                            >
                                                {p.name.includes('Enterprise') ? 'Request a Demo' : 'Buy Now'}
                                            </PricingButton>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Feature Rows */}
                            {featureGroups.map((group, idx) => (
                                <div key={idx} className="border-t border-gray-100">
                                    {/* Group Title */}
                                    <div style={{ gridTemplateColumns: gridTemplate }} className="grid bg-gray-50">
                                        <div className="p-3 font-extrabold text-xs uppercase text-indigo-700 tracking-wider col-span-1 flex items-center">
                                            {group.icon}
                                            {group.title}
                                        </div>
                                        {/* Blank cells for feature groups to align visually */}
                                        {plans.map(p => <div key={p.id} className="p-3 border-l border-gray-100"></div>)}
                                    </div>

                                    {/* Features List */}
                                    {group.features.map((f) => (
                                        <div key={f.key} style={{ gridTemplateColumns: gridTemplate }} className="grid divide-x border-b border-gray-100 transition-colors hover:bg-indigo-50/50">
                                            <div className="p-4 text-sm font-medium text-gray-700 flex items-center">
                                                {f.label}
                                            </div>
                                            {plans.map((p, pIndex) => (
                                                <div
                                                    key={p.id}
                                                    className={`p-4 flex justify-center items-center ${pIndex === proPlanIndex ? 'bg-indigo-50/20' : ''}`}
                                                >
                                                    <FeatureCell
                                                        value={p[f.key]}
                                                        plan={p}
                                                        type={f.type}
                                                        featureKey={f.key}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* VERIFY OVERLAY */}
                <AnimatePresence>
                    {isVerifying && (
                        <motion.div
                            className="fixed inset-0 z-[11000] flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <div className="absolute inset-0 bg-black/60" />
                            <motion.div className="relative z-10 p-8 bg-[#080C16] rounded-2xl border border-[#00F0FF]/30 shadow-2xl flex flex-col items-center gap-4">
                                <svg
                                    className="animate-spin h-12 w-12 text-[#00F0FF]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                                <div className="text-white font-medium">Verifying payment…</div>
                                <div className="text-sm text-white/60">Do not close this window.</div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- Call to Action --- */}
                <div className="text-center my-20 bg-white p-10 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Ready to Dive In?</h2>
                    <p className="text-gray-600 max-w-xl mx-auto mb-8">
                        Experience the platform difference. Start your free, no-commitment trial today and instantly access all Pro features on new registration.
                    </p>
                    <Link className="w-auto px-12 py-3.5 shadow-xl rounded-lg bg-green-500 text-white hover:bg-green-600 shadow-green-500/50" to="/register">
                        Start Free 1-Month Trial
                    </Link>
                </div>

                {/* --- FAQ Section --- */}
                <div className="border-b border-gray-200 mb-12"></div>
                <div className="pb-20">
                    <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-10">
                        Frequently Asked Questions
                    </h2>

                    <div className="max-w-4xl mx-auto space-y-2">

                        <FAQ
                            q="What happens after I sign up for a free trial?"
                            a="You get full access to the Pro plan during your trial. If you buy a paid plan while still in trial, upgrades start immediately and lower-tier plans are queued to begin when the trial ends."
                        />

                        <FAQ
                            q="If I upgrade to a higher-tier plan, when does it start?"
                            a="Upgrading always activates right away. Your new limits take effect instantly and your previous plan is replaced."
                        />

                        <FAQ
                            q="What happens if I buy a lower-tier plan while I’m already on a higher one?"
                            a="Lower-tier purchases never override your active plan. They are queued automatically and will start after your current plan expires."
                        />

                        <FAQ
                            q="How does monthly vs annual billing work?"
                            a="Both cycles include the same features. Monthly renews every 30 days, while annual gives you a discounted price for the whole year."
                        />

                        <FAQ
                            q="How do dashboard add-ons work?"
                            a="Add-ons increase your dashboard limit based on your plan’s add-on pack. They run independently from your main plan and stay active until their own expiry date."
                        />

                        <FAQ
                            q="If I upgrade my plan, what happens to my existing add-ons?"
                            a="Your add-ons stay active until they expire. If your new plan allows add-ons, you can keep buying more."
                        />

                        <FAQ
                            q="What happens when my plan expires?"
                            a="If you have a queued plan, it starts automatically. If not, your account switches to the free tier."
                        />

                        <FAQ
                            q="Are payments refundable?"
                            a="All plan and add-on purchases are final and non-refundable."
                        />

                        <FAQ
                            q="Payment was successful but my plan didn’t update. What should I do?"
                            a="Your plan usually updates right after verification. If not, refresh the page or contact support for help."
                        />

                        <FAQ
                            q="How is my dashboard limit calculated?"
                            a="Your plan's base dashboard limit is combined with all active add-ons. Queued plans or expired add-ons do not affect your current limit."
                        />

                    </div>
                </div>
            </div>
        </div>
    );
}