// HomeContent.jsx
import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    FaUserPlus,
    FaDatabase,
    FaCogs,
    FaCheckCircle,
    FaChartBar,
    FaCreditCard,
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { CheckCircle2, Lock, XCircle } from "lucide-react";

function HomeContent() {
    const [plans, setPlans] = useState([]);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
        const fetchData = async () => {
            try {
                // ✅ Always fetch plans
                const plansRes = await api.get("/dashboard/plan-details");
                const sortedPlans = plansRes.data.sort(
                    (a, b) => a.durationDays - b.durationDays
                );
                setPlans(sortedPlans);

                // ✅ Try fetching subscription status only if user is logged in
                try {
                    const subRes = await api.get("/user/subscription-status");
                    setSubscriptionStatus(subRes.data);
                } catch (statusErr) {
                    console.warn("No subscription status (probably not logged in)", statusErr);
                    setSubscriptionStatus(null);
                }
            } catch (err) {
                console.error("Failed to fetch plans", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const getDiscountNote = (plan, prevPlan) => {
        if (!prevPlan) return null;
        const prevDaily = prevPlan.price / prevPlan.durationDays;
        const planDaily = plan.price / plan.durationDays;
        if (planDaily < prevDaily) {
            const percent = Math.round(((prevDaily - planDaily) / prevDaily) * 100);
            return `Save ${percent}% compared to ${prevPlan.name}`;
        }
        return null;
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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading plans...</div>
            </div>
        );
    }

    // 👉 Information Steps (short preview for home page)
    const steps = [
        {
            icon: <FaUserPlus className="text-blue-600 text-2xl" />,
            title: "Register",
            desc: "Create your account and confirm email.",
        },
        {
            icon: <FaDatabase className="text-green-600 text-2xl" />,
            title: "Submit DB",
            desc: "Provide your database details.",
        },
        {
            icon: <FaCogs className="text-yellow-600 text-2xl" />,
            title: "Admin Setup",
            desc: "Admin configures modules & dashboard.",
        },
        {
            icon: <FaCheckCircle className="text-indigo-600 text-2xl" />,
            title: "Activation",
            desc: "Your account gets activated.",
        },
        {
            icon: <FaChartBar className="text-purple-600 text-2xl" />,
            title: "Dashboard",
            desc: "Access real-time insights.",
        },
        {
            icon: <FaCreditCard className="text-red-600 text-2xl" />,
            title: "Free Trial",
            desc: "Enjoy 7 days free, then choose a plan.",
        },
    ];

    return (
        <div className="bg-white text-gray-900">
            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col md:flex-row items-center gap-10">
                {/* Left text */}
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight">
                        <div className="mb-3">Your Dashboard.</div>
                        <div className="mb-3">Your Data.</div>
                        <div>Real-Time.</div>
                    </h1>
                    <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl text-gray-600">
                        Connect, monitor, and act on live business insights.
                    </p>
                    <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl text-purple-600 font-semibold">
                        Start your{" "}
                        <Link
                            to="/information"
                            className="underline text-purple-600 hover:text-purple-800"
                        >
                            7-day free trial
                        </Link>{" "}
                        — on registration!
                    </p>

                    <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <Link className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg shadow transition w-full sm:w-auto"
                            to="/information">
                            More Info
                        </Link>
                        <Link
                            className="border border-purple-600 text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-lg transition w-full sm:w-auto"
                            to="/subscription/buy"
                        >
                            View Plans
                        </Link>
                    </div>
                </div>

                {/* Right image */}
                <div className="flex-1">
                    <img
                        src="/laptop.png"
                        alt="Dashboard preview"
                        className="mx-auto w-full max-w-[750px] h-auto"
                    />
                </div>
            </section>

            {/* Why Use Section */}
            <section className="py-12 md:py-16 bg-white text-center px-4">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                    Why Use minutechart
                </h2>
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                    <div>
                        <img src="/multitenant1.svg" alt="" className="h-12 mx-auto mb-3" />
                        <p className="text-lg font-semibold">Multi-Tenant Dashboarding</p>
                    </div>
                    <div>
                        <img src="/recycle.svg" alt="" className="h-12 mx-auto mb-3" />
                        <p className="text-lg font-semibold">Real-Time Data Sync</p>
                    </div>
                    <div>
                        <img src="/mapping.svg" alt="" className="h-12 mx-auto mb-3" />
                        <p className="text-lg font-semibold">Smart Schema Mapping</p>
                    </div>
                    <div>
                        <img src="/chart.svg" alt="" className="h-12 mx-auto mb-3" />
                        <p className="text-lg font-semibold">Ready-to-Use Visualizations</p>
                    </div>
                </div>
            </section>

            {/* ✨ How It Works (Centered Grid, 2 Rows × 3 Columns) */}
            <section className="py-16 bg-gray-50 px-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
                    How It Works in 6 Steps
                </h2>

                {/* Centered Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {steps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            className="bg-white rounded-2xl shadow p-6 flex flex-col items-center text-center hover:shadow-xl transition"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.4 }}
                        >
                            <div className="mb-4">{step.icon}</div>
                            <h3 className="font-semibold text-lg">{step.title}</h3>
                            <p className="text-gray-600 text-sm mt-2">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="text-center mt-10">
                    <Link
                        to="/information"
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow font-semibold"
                    >
                        Learn More →
                    </Link>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-12 md:py-16 bg-white px-4">
                <div className="max-w-7xl mx-auto text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                        Choose Your Plan
                    </h2>
                    <p className="mt-3 text-gray-600 text-lg">
                        Flexible options designed to match your needs.
                    </p>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                    {plans.map((plan, index) => {
                        const prevPlan = index > 0 ? plans[index - 1] : null;
                        const discountNote = getDiscountNote(plan, prevPlan);

                        return (
                            <div
                                key={plan.id}
                                className={`border rounded-lg p-6 sm:p-8 shadow hover:shadow-lg transition relative 
                  ${plan.highlight
                                        ? plan.highlight === "Best Value"
                                            ? "bg-green-50 border-green-600 shadow-lg"
                                            : "bg-purple-50 border-purple-600 shadow-lg"
                                        : ""
                                    }`}
                            >
                                {plan.highlight && (
                                    <span
                                        className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs px-3 py-1 rounded-full 
                      ${plan.highlight === "Best Value"
                                                ? "bg-green-600"
                                                : "bg-purple-600"
                                            }`}
                                    >
                                        {plan.highlight}
                                    </span>
                                )}

                                <h4 className="text-lg font-semibold mb-2">{plan.name}</h4>
                                <p className="text-2xl sm:text-3xl font-bold">
                                    ₹{plan.price}{" "}
                                    <span className="text-base text-gray-500">
                                        / {plan.durationDays} days
                                    </span>
                                </p>
                                <p className="mt-2 text-gray-600">{plan.features}</p>
                                {discountNote && (
                                    <p className="mt-1 text-gray-500 text-sm">{discountNote}</p>
                                )}

                                <button
                                    onClick={() => handleChoose(plan)}
                                    className={`mt-6 w-full py-2 px-4 rounded-lg transition 
                    ${plan.highlight === "Best Value"
                                            ? "bg-green-600 hover:bg-green-700 text-white"
                                            : "bg-purple-600 hover:bg-purple-700 text-white"
                                        }`}
                                >
                                    Choose Plan
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

export default HomeContent;
