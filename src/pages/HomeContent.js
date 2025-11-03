// // src/pages/HomeContent.jsx
// import React, { useState, useEffect } from "react";
// import api from "../api";
// import { useNavigate, Link } from "react-router-dom";
// import { motion } from "framer-motion";
// import {
//     FaUserPlus,
//     FaDatabase,
//     FaCogs,
//     FaCheckCircle,
//     FaChartBar,
//     FaCreditCard,
//     FaArrowRight,
// } from "react-icons/fa";
// import { toast } from "react-hot-toast";
// import { CheckCircle2, Lock, XCircle } from "lucide-react";

// // --- Custom Components ---

// const StepCard = ({ icon, title, desc, delay }) => (
//     <motion.div
//         className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center text-center border-t-4 border-indigo-200 hover:border-purple-600 transition duration-300 h-full"
//         initial={{ opacity: 0, y: 30 }}
//         whileInView={{ opacity: 1, y: 0 }}
//         viewport={{ once: true }}
//         transition={{ delay, duration: 0.4 }}
//     >
//         <div className="mb-4">{icon}</div>
//         <h3 className="font-bold text-xl mb-2">{title}</h3>
//         <p className="text-gray-600 text-base">{desc}</p>
//     </motion.div>
// );

// const PricingCard = ({ plan, prevPlan, getDiscountNote, handleChoose }) => {
//     const discountNote = getDiscountNote(plan, prevPlan);
//     const isHighlight = plan.highlight;
//     const highlightColor = isHighlight ? (plan.highlight === "Best Value" ? "green" : "purple") : "";

//     // Calculate dynamic border/background classes
//     const classes = `border rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition relative 
//         ${isHighlight
//             ? `bg-${highlightColor}-50 border-${highlightColor}-600`
//             : "bg-gray-50 border-[#0F172A]"
//         } 
//         flex flex-col h-full`; // h-full ensures equal height for button alignment

//     return (
//         <div className={classes}>
//             {isHighlight && (
//                 <span
//                     className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-sm font-semibold px-4 py-1 rounded-full 
//                     bg-${highlightColor}-600 shadow-md`}
//                 >
//                     {plan.highlight}
//                 </span>
//             )}

//             <h4 className="text-xl font-bold mb-4 mt-2">{plan.name}</h4>
//             <div className="flex-1"> {/* Push button to the bottom */}
//                 <p className="text-4xl font-extrabold text-gray-900">
//                     ₹{plan.price}{" "}
//                     <span className="text-lg text-gray-500 font-normal">
//                         / {plan.durationDays} days
//                     </span>
//                 </p>
//                 <p className="mt-4 text-gray-600 text-sm">{plan.features}</p>
//                 {discountNote && (
//                     <p className="mt-2 text-green-600 font-medium text-sm">
//                         {discountNote}
//                     </p>
//                 )}
//             </div>

//             <button
//                 onClick={() => handleChoose(plan)}
//                 className={`mt-8 w-full py-3 px-4 rounded-xl transition font-semibold text-lg
//                 ${isHighlight 
//                     ? `bg-${highlightColor}-600 hover:bg-${highlightColor}-700 text-white shadow-md`
//                     : "bg-[#0F172A]/95 hover:bg-[#0F172A]/100 text-white shadow-md"
//                 }`}
//             >
//                 Choose Plan
//             </button>
//         </div>
//     );
// };

// // --- Main Component ---

// function HomeContent() {
//     const [plans, setPlans] = useState([]);
//     const [subscriptionStatus, setSubscriptionStatus] = useState(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [verifying, setVerifying] = useState(false);
//     const navigate = useNavigate();
//     const user = JSON.parse(localStorage.getItem("user"));

//     // --- Data Fetching Logic (Retained) ---
//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 const plansRes = await api.get("/dashboard/plan-details");
//                 const sortedPlans = plansRes.data.sort(
//                     (a, b) => a.durationDays - b.durationDays
//                 );
//                 setPlans(sortedPlans);

//                 try {
//                     const subRes = await api.get("/user/subscription-status");
//                     setSubscriptionStatus(subRes.data);
//                 } catch (statusErr) {
//                     setSubscriptionStatus(null);
//                 }
//             } catch (err) {
//                 console.error("Failed to fetch plans", err);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchData();
//     }, []);

//     const getDiscountNote = (plan, prevPlan) => {
//         if (!prevPlan) return null;
//         const prevDaily = prevPlan.price / prevPlan.durationDays;
//         const planDaily = plan.price / plan.durationDays;
//         if (planDaily < prevDaily) {
//             const percent = Math.round(((prevDaily - planDaily) / prevDaily) * 100);
//             return `Save ${percent}% compared to ${prevPlan.name}`;
//         }
//         return null;
//     };

//     const loadRazorpayScript = () => {
//         return new Promise((resolve) => {
//             if (window.Razorpay) return resolve(true);
//             const script = document.createElement("script");
//             script.src = "https://checkout.razorpay.com/v1/checkout.js";
//             script.onload = () => resolve(true);
//             script.onerror = () => resolve(false);
//             document.body.appendChild(script);
//         });
//     };

//     // --- Toast Functions (Retained) ---
//     const showSuccessToast = () => {
//         toast.custom(
//             (t) => (
//                 <div
//                     className={`transition-opacity duration-300 ${t.visible ? "opacity-100" : "opacity-0"} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-green-500`}
//                 >
//                     <div className="flex-1 w-0 p-4">
//                         <div className="flex items-start">
//                             <div className="flex-shrink-0 pt-0.5">
//                                 <CheckCircle2 className="h-6 w-6 text-green-600" />
//                             </div>
//                             <div className="ml-3 flex-1">
//                                 <p className="text-sm font-medium text-black">
//                                     Payment Verified Successfully
//                                 </p>
//                                 <p className="mt-1 text-sm text-black">
//                                     Your subscription is now active. An invoice has been emailed and
//                                     is also available in your Purchase History.
//                                 </p>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             ),
//             { duration: 8000 }
//         );
//     };

//     const showErrorToast = () => {
//         toast.custom(
//             (t) => (
//                 <div
//                     className={`transition-opacity duration-300 ${t.visible ? "opacity-100" : "opacity-0"} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-red-500`}
//                 >
//                     <div className="flex-1 w-0 p-4">
//                         <div className="flex items-start">
//                             <div className="flex-shrink-0 pt-0.5">
//                                 <XCircle className="h-6 w-6 text-red-600" />
//                             </div>
//                             <div className="ml-3 flex-1">
//                                 <p className="text-sm font-medium text-black">
//                                     Payment Verification Failed
//                                 </p>
//                                 <p className="mt-1 text-sm text-black">
//                                     We couldn’t verify your payment. Please try again or contact
//                                     support.
//                                 </p>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             ),
//             { duration: 8000 }
//         );
//     };

//     const handleChoose = async (plan) => {
//         if (!user) {
//             toast.error("⚠️ Please log in to subscribe to a plan.");
//             navigate("/login", { state: { from: "/subscription/buy" } });
//             return;
//         }

//         try {
//             const createResp = await api.post("/subscription/create-order", { planId: plan.id });
//             const { orderId, amount, currency, key } = createResp.data;

//             const loaded = await loadRazorpayScript();
//             if (!loaded) {
//                 toast.error("Failed to load payment SDK");
//                 return;
//             }

//             const options = {
//                 key,
//                 amount,
//                 currency,
//                 name: "minutechart",
//                 description: `${plan.name} plan`,
//                 order_id: orderId,
//                 handler: async (response) => {
//                     setVerifying(true);
//                     try {
//                         await api.post("/subscription/verify", {
//                             orderId: response.razorpay_order_id,
//                             paymentId: response.razorpay_payment_id,
//                             signature: response.razorpay_signature,
//                         });

//                         showSuccessToast();
//                         setTimeout(() => setVerifying(false), 500);
//                     } catch (verifyErr) {
//                         console.error("Verification failed", verifyErr);
//                         showErrorToast();
//                         setTimeout(() => setVerifying(false), 500);
//                     }
//                 },
//                 theme: { color: "#6d28d9" },
//             };

//             new window.Razorpay(options).open();
//         } catch (err) {
//             console.error("Error in handleChoose", err);
//             toast.error("Failed to start payment");
//         }
//     };

//     if (isLoading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-50 to-indigo-50">
//                 <div className="text-lg text-gray-700 animate-pulse">Loading Home Page...</div>
//             </div>
//         );
//     }

//     // 👉 Information Steps (short preview for home page)
//     const steps = [
//         {
//             icon: <FaUserPlus className="text-blue-600 text-3xl" />,
//             title: "1. Register",
//             desc: "Create your secure account and confirm your email.",
//         },
//         {
//             icon: <FaDatabase className="text-green-600 text-3xl" />,
//             title: "2. Submit DB",
//             desc: "Securely provide your database connection details.",
//         },
//         {
//             icon: <FaCogs className="text-yellow-600 text-3xl" />,
//             title: "3. Admin Setup",
//             desc: "Admin configures modules & sets up your dashboard.",
//         },
//         {
//             icon: <FaCheckCircle className="text-indigo-600 text-3xl" />,
//             title: "4. Activation",
//             desc: "Your account is activated and ready for use.",
//         },
//         {
//             icon: <FaChartBar className="text-purple-600 text-3xl" />,
//             title: "5. Dashboard",
//             desc: "Access real-time, custom-built visual insights.",
//         },
//         {
//             icon: <FaCreditCard className="text-red-600 text-3xl" />,
//             title: "6. Free Trial",
//             desc: "Enjoy full access with a 7-day free trial on registration.",
//         },
//     ];

//     return (
//         <div className="bg-white text-gray-900">
//             {/* --- Hero Section --- */}
//             <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24 flex flex-col md:flex-row items-center gap-10">
//                 {/* Left text */}
//                 <motion.div
//                     className="flex-1 text-center md:text-left"
//                     initial={{ opacity: 0, x: -20 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     transition={{ duration: 0.8 }}
//                 >
//                     <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight">
//                         <div className="text-gray-900">Your Dashboard.</div>
//                         <div className="text-indigo-600">Your Data.</div>
//                         <div className="text-purple-600">Real-Time.</div>
//                     </h1>
//                     <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl text-gray-600 max-w-lg md:max-w-full mx-auto md:mx-0">
//                         Connect, monitor, and act on live business insights—from a single, intuitive platform.
//                     </p>
//                     <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl text-purple-600 font-semibold">
//                         Start your 
//                         <Link
//                             to="/information"
//                             className="underline mx-1 text-indigo-600 hover:text-indigo-800"
//                         >
//                             7-day free trial
//                         </Link>
//                         — on registration!
//                     </p>

//                     <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
//                         <Link className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl shadow-lg transition w-full sm:w-auto text-lg font-bold flex items-center justify-center gap-2"
//                             to="/information">
//                             More Info <FaArrowRight />
//                         </Link>
//                         <Link
//                             className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-4 rounded-xl transition w-full sm:w-auto text-lg font-bold"
//                             to="/subscription/buy"
//                         >
//                             View Plans
//                         </Link>
//                     </div >
//                 </motion.div>

//                 {/* Right image */}
//                 <motion.div
//                     className="flex-1 w-full max-w-xl md:max-w-none"
//                     initial={{ opacity: 0, x: 20 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     transition={{ duration: 0.8 }}
//                 >
//                     <img
//                         src="/laptop.png"
//                         alt="Dashboard preview"
//                         className="mx-auto w-full h-auto rounded-xl shadow-2xl"
//                     />
//                 </motion.div>
//             </section>

//             <hr className="border-gray-200 mx-auto max-w-7xl" />

//             {/* --- Why Use Section --- */}
//             <section className="py-16 bg-white text-center px-4">
//                 <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900">
//                     Why Choose minutechart
//                 </h2>
//                 <p className="mt-4 text-lg text-gray-600">Built for speed, scalability, and seamless integration.</p>
//                 <div className="mt-12 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
//                     <div className="p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 transition duration-200">
//                         <img src="/multitenant1.svg" alt="Multi-Tenant Icon" className="h-14 mx-auto mb-3" />
//                         <p className="text-base sm:text-lg font-bold text-gray-800">Multi-Tenant Dashboarding</p>
//                     </div>
//                     <div className="p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 transition duration-200">
//                         <img src="/recycle.svg" alt="Real-Time Icon" className="h-14 mx-auto mb-3" />
//                         <p className="text-base sm:text-lg font-bold text-gray-800">Real-Time Data Sync</p>
//                     </div>
//                     <div className="p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 transition duration-200">
//                         <img src="/mapping.svg" alt="Schema Mapping Icon" className="h-14 mx-auto mb-3" />
//                         <p className="text-base sm:text-lg font-bold text-gray-800">Smart Schema Mapping</p>
//                     </div>
//                     <div className="p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 transition duration-200">
//                         <img src="/chart.svg" alt="Visualization Icon" className="h-14 mx-auto mb-3" />
//                         <p className="text-base sm:text-lg font-bold text-gray-800">Ready-to-Use Visualizations</p>
//                     </div>
//                 </div>
//             </section>

//             <hr className="border-gray-200 mx-auto max-w-7xl" />

//             {/* --- How It Works (Steps) --- */}
//             <section className="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8">
//                 <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-16">
//                     Our 6-Step Setup Process
//                 </h2>

//                 {/* Centered Grid Layout (Stacks on mobile, 3 columns on desktop) */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
//                     {steps.map((step, idx) => (
//                         <StepCard {...step} key={idx} delay={idx * 0.1} />
//                     ))}
//                 </div>

//                 <div className="text-center mt-12">
//                     <Link
//                         to="/information"
//                         className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg font-bold text-lg transition duration-200"
//                     >
//                         Learn More About Setup →
//                     </Link>
//                 </div>
//             </section>

//             <hr className="border-gray-200 mx-auto max-w-7xl" />

//             {/* --- Pricing Section --- */}
//             <section className="py-16 bg-white px-4">
//                 <div className="max-w-7xl mx-auto text-center mb-12">
//                     <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900">
//                         Choose Your Plan
//                     </h2>
//                     <p className="mt-3 text-gray-600 text-xl">
//                         Flexible options designed to match your company's growth.
//                     </p>
//                 </div>

//                 {/* Pricing Cards Grid: Stacks on very small, 2 columns on small, 4 on large */}
//                 <div className="max-w-7xl mx-auto grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
//                     {plans.map((plan, index) => {
//                         const prevPlan = index > 0 ? plans[index - 1] : null;

//                         return (
//                             <PricingCard 
//                                 key={plan.id}
//                                 plan={plan}
//                                 prevPlan={prevPlan}
//                                 getDiscountNote={getDiscountNote}
//                                 handleChoose={handleChoose}
//                             />
//                         );
//                     })}
//                 </div>

//                 {/* Additional Pricing Action
//                 <div className="text-center mt-12">
//                     <Link
//                         to="/subscription/buy"
//                         className="text-lg font-semibold text-purple-600 hover:text-purple-800 underline transition"
//                     >
//                         Need a custom enterprise quote? Contact Sales →
//                     </Link>
//                 </div> */}

//             </section>
//         </div>
//     );
// }

// export default HomeContent;


// src/pages/HomeContent.jsx
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
    FaArrowRight,
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { CheckCircle2, Zap, TrendingUp, Cpu, Server, Database, BarChart, Clock } from "lucide-react";

// --- Custom Components ---

const StepCard = ({ icon, title, desc, delay }) => (
    <motion.div
        className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center text-center border-b-4 border-indigo-200 hover:border-teal-500 transition duration-300 h-full transform hover:scale-[1.02]"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.4 }}
    >
        <div className="mb-4 text-5xl text-teal-500">{icon}</div>
        <h3 className="font-bold text-xl mb-2 text-gray-900">{title}</h3>
        <p className="text-gray-600 text-base">{desc}</p>
    </motion.div>
);

// --- Main Component ---

function HomeContent() {
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    // --- Data Fetching Logic (Retained) ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const plansRes = await api.get("/dashboard/plan-details");
                const sortedPlans = plansRes.data.sort(
                    (a, b) => a.durationDays - b.durationDays
                );
                setPlans(sortedPlans);
            } catch (err) {
                console.error("Failed to fetch plans", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Placeholder for payment handlers (kept minimal as per request)
    const handleChoose = () => {
        // if (!user) {
        //     toast.error("⚠️ Please log in to subscribe to a plan.");
        //     navigate("/login", { state: { from: "/subscription/buy" } });
        //     return;
        // }
        navigate("/subscription/buy");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-xl text-indigo-600 font-semibold flex items-center gap-3">
                    <Clock className="w-5 h-5 animate-spin" /> Loading Home Page...
                </div>
            </div>
        );
    }

    // 👉 Information Steps 
    const steps = [
        {
            icon: <FaUserPlus />,
            title: "1. Register Account",
            desc: "Create your secure account and gain instant trial access.",
        },
        {
            icon: <FaDatabase />,
            title: "2. Connect Database",
            desc: "Securely provide your SQL connection credentials.",
        },
        {
            icon: <FaCogs />,
            title: "3. Admin Setup",
            desc: "We configure your custom query modules and dashboard layout.",
        },
        {
            icon: <FaCheckCircle />,
            title: "4. Instant Activation",
            desc: "Your account is validated and fully ready to stream data.",
        },
        {
            icon: <FaChartBar />,
            title: "5. Get Visual Insights",
            desc: "View custom charts, KPIs, and reports—all in one place.",
        },
        {
            icon: <FaCreditCard />,
            title: "6. Deploy & Scale",
            desc: "Expand to more clients easily with multi-tenant support.",
        },
    ];

    return (
        <div className="bg-white text-gray-900">
            {/* --- Hero Section --- */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24 flex flex-col md:flex-row items-center gap-10">
                {/* Left text */}
                <motion.div
                    className="flex-1 text-center md:text-left"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-tight">
                        <div className="text-gray-900">Your Data.</div>
                        <div className="text-indigo-700">Your Dashboard.</div>
                        <div className="text-teal-500">Real Time.</div>
                    </h1>
                    <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl text-gray-600 max-w-lg md:max-w-full mx-auto md:mx-0">
                        Stop waiting for weekly reports. <strong className="text-[#0F172A] italic">NGraph</strong> delivers multi-tenant, custom SQL-driven visualizations with sub-minute refresh rates.
                    </p>
                    <p className="mt-6 sm:mt-8 text-xl text-purple-600 font-bold flex items-center justify-center md:justify-start gap-2">
                        <Zap className="w-5 h-5 text-teal-500" /> Start your <Link to="/information" className="underline mx-1 text-indigo-700 hover:text-indigo-900 transition">7-day free trial</Link> today!
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <Link className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl shadow-xl transition w-full sm:w-auto text-lg font-bold flex items-center justify-center gap-2"
                            to="/information">
                            Discover Value <FaArrowRight />
                        </Link>
                        <Link
                            className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-4 rounded-xl transition w-full sm:w-auto text-lg font-bold shadow-md"
                            to={user ? "/subscription/buy" : "/login"} // CTA depends on login status
                        >
                            {user ? "View Plans" : "Register & Try Free"}
                        </Link>
                    </div >
                </motion.div>

                {/* Right image */}
                <motion.div
                    className="flex-1 w-full max-w-xl md:max-w-none"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <img
                        src="/laptop.png"
                        alt="Dashboard preview showing live charts"
                        className="mx-auto w-full h-auto"
                    />
                </motion.div>
            </section>

            ---

            {/* --- Features Section --- */}
            <section className="py-16 bg-gray-50 text-center px-4">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900">
                        Built for Business Intelligence. Engineered for Speed.
                    </h2>
                    <p className="mt-4 text-lg text-gray-600">The core advantages that make us the fastest way to real-time insights.</p>

                    {/* Feature Icons Grid */}
                    <div className="mt-12 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-6 rounded-xl bg-white hover:bg-indigo-50 transition duration-200 shadow-lg border-b-4 border-indigo-200">
                            <Server className="h-14 w-14 mx-auto mb-3 text-indigo-600" />
                            <p className="text-base sm:text-lg font-bold text-gray-800">Multi-Tenant Dashboarding</p>
                            <p className="text-sm text-gray-500 mt-1">Manage and isolate client data securely.</p>
                        </div>
                        <div className="p-6 rounded-xl bg-white hover:bg-indigo-50 transition duration-200 shadow-lg border-b-4 border-indigo-200">
                            <Clock className="h-14 w-14 mx-auto mb-3 text-teal-600" />
                            <p className="text-base sm:text-lg font-bold text-gray-800">Real-Time Data Sync</p>
                            <p className="text-sm text-gray-500 mt-1">Updates in seconds, not hours.</p>
                        </div>
                        <div className="p-6 rounded-xl bg-white hover:bg-indigo-50 transition duration-200 shadow-lg border-b-4 border-indigo-200">
                            <Database className="h-14 w-14 mx-auto mb-3 text-green-600" />
                            <p className="text-base sm:text-lg font-bold text-gray-800">Custom SQL Power</p>
                            <p className="text-sm text-gray-500 mt-1">Use your existing custom query logic.</p>
                        </div>
                        <div className="p-6 rounded-xl bg-white hover:bg-indigo-50 transition duration-200 shadow-lg border-b-4 border-indigo-200">
                            <BarChart className="h-14 w-14 mx-auto mb-3 text-purple-600" />
                            <p className="text-base sm:text-lg font-bold text-gray-800">Interactive Visuals</p>
                            <p className="text-sm text-gray-500 mt-1">Rich charts, maps, and KPI cards ready to go.</p>
                        </div>
                    </div>
                </div>
            </section>

            ---

            {/* --- How It Works (Steps) --- */}
            <section className="py-16 bg-white px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-16 text-gray-900">
                        Get Started in 6 Simple Steps
                    </h2>

                    {/* Centered Grid Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {steps.map((step, idx) => (
                            <StepCard {...step} key={idx} delay={idx * 0.1} />
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            to="/information"
                            className="px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-xl font-bold text-lg transition duration-200 flex items-center justify-center sm:inline-flex gap-2"
                        >
                            View Detailed Setup Guide <FaArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            ---

            {/* --- Pricing CTA Section (Simplified) --- */}
            <section className="py-16 bg-gray-50 px-4">
                <div className="max-w-4xl mx-auto text-center p-8 rounded-2xl shadow-2xl bg-indigo-700 text-white">
                    <h2 className="text-3xl sm:text-4xl font-extrabold">
                        Ready to Transform Your Reporting?
                    </h2>
                    <p className="mt-3 text-xl font-medium opacity-90">
                        Choose the right subscription for your business scale.
                    </p>
                    <div className="mt-6">
                        <p className="text-3xl font-extrabold text-teal-300">
                            Plans starting from ₹{plans[0]?.price || 'XXX'}/month.
                        </p>
                    </div>

                    {/* CTA Button */}
                    <Link
                        to="/subscription/buy"
                        onClick={handleChoose}
                        className="mt-8 px-10 py-4 bg-teal-500 text-white rounded-xl shadow-lg font-bold text-lg hover:bg-teal-600 transition inline-flex items-center gap-2"
                    >
                        View Full Pricing & Subscribe
                    </Link>
                </div>
            </section>
        </div>
    );
}

export default HomeContent;