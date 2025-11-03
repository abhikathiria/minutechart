import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    FaCheckCircle,
    FaDatabase,
    FaUserPlus,
    FaCogs,
    FaChartBar,
    FaCreditCard,
    FaChevronDown,
    FaUserAlt
} from "react-icons/fa";
import api from "../api";
import { Link } from "react-router-dom";

export default function Information() {
    const [openIndex, setOpenIndex] = useState(null);
    const [isRegistered, setIsRegistered] = useState(null);

    const toggleAccordion = (index) => setOpenIndex(openIndex === index ? null : index);

    useEffect(() => {
        let mounted = true;
        const fetchStatus = async () => {
            try {
                // Check if user is logged in
                const res = await api.get("/user/subscription-status");
                // If it succeeds, they are at least registered/logged in
                if (mounted) setIsRegistered(true);
            } catch (error) {
                // Assuming any error (401, 403, network) means not logged in
                if (mounted) setIsRegistered(false);
            }
        };
        fetchStatus();
        return () => (mounted = false);
    }, []);

    // --- Content Data ---
    const steps = [
        { icon: <FaUserPlus className="text-white" />, title: "1. Register Account", desc: "Sign up on the platform and confirm your email to activate your registration." },
        { icon: <FaDatabase className="text-white" />, title: "2. Submit Database Details", desc: "Send your database connection details to the admin for setup." },
        { icon: <FaCogs className="text-white" />, title: "3. Admin Setup", desc: "Admin configures the connection and creates required dashboard modules." },
        { icon: <FaCheckCircle className="text-white" />, title: "4. Account Activation", desc: "Your account is activated once setup is complete, and your trial begins." },
        { icon: <FaChartBar className="text-white" />, title: "5. Dashboard Access", desc: "View your personal dashboard with your live data and configured modules." },
        { icon: <FaCreditCard className="text-white" />, title: "6. Free Trial & Paid Plans", desc: "Enjoy a 7-day free trial period. After that, subscribe to a plan to continue using the service." },
    ];

    const terms = [
        { title: "Eligibility", desc: "The 7-day free trial is available only for new users registering for the first time." },
        { title: "Trial Period", desc: "The trial begins once the admin activates your account and lasts for 7 calendar days." },
        { title: "Account Setup", desc: "Trial will not start until you provide valid database details and specify your modules." },
        { title: "Limitations", desc: "You cannot change database connections or modules yourself during the trial." },
        { title: "Conversion to Paid Plan", desc: "After the 7-day period expires, you must subscribe to a paid plan to regain access." },
        { title: "Admin Rights", desc: "Admin may suspend, deactivate, or block accounts in case of misuse or violations." },
        { title: "Data Security", desc: "You are solely responsible for the correctness and security of the database credentials provided." },
    ];

    const additionalNotes = [
        "Users can only view dashboards; admins handle all module and system configurations.",
        "Only admins can set database connections and modify existing modules.",
        "For any issues, queries, or custom module requests, users must contact the admin directly.",
    ];

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">

            {/* --- Hero Section --- */}
            <motion.header
                className="relative bg-gradient-to-br from-blue-700 to-indigo-800 text-white py-24 px-4 sm:px-6 text-center overflow-hidden shadow-2xl"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="absolute inset-0 bg-dots opacity-5"></div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 relative z-10">
                    How NGraph Works
                </h1>
                <p className="text-lg md:text-xl opacity-90 relative z-10 max-w-3xl mx-auto">
                    A simple 6-step process to get your live dashboard, plus important details on your 7-day free trial.
                </p>
            </motion.header>

            {/* --- 6-Step Timeline Section --- */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
                <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center text-gray-900">Step-by-Step Activation Timeline</h2>
                
                <div className="relative">
                    {/* Vertical Timeline Line (Desktop Only) */}
                    <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 w-1 h-full bg-gradient-to-b from-blue-300 to-purple-400 rounded" />
                    
                    {steps.map((step, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                            <div
                                key={idx}
                                // FIX 1: Ensure mobile stacks vertically without reversing order
                                className={`flex flex-col md:flex-row items-center mb-16 ${!isEven ? "md:flex-row-reverse" : ""}`} 
                            >
                                {/* Content Card */}
                                <motion.div
                                    initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, amount: 0.5 }}
                                    transition={{ duration: 0.45, delay: idx * 0.06 }}
                                    // FIX 2: Added flex-grow on mobile to use full available width inside the section
                                    className="bg-white rounded-xl shadow-2xl p-6 w-full md:w-5/12 border border-gray-100 transform hover:scale-[1.02] transition duration-300" 
                                >
                                    <h3 className="font-bold text-xl text-blue-800">{step.title}</h3>
                                    <p className="text-gray-600 text-base mt-2">{step.desc}</p>
                                </motion.div>

                                {/* Center Circle/Icon */}
                                <div className="relative md:w-2/12 flex justify-center items-center my-6 md:my-0">
                                    {/* Small circle indicator for mobile view */}
                                    <div className="md:hidden absolute w-full h-0.5 bg-blue-300 top-1/2 -translate-y-1/2"></div>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ type: "spring", stiffness: 260, damping: 20, delay: idx * 0.05 }}
                                        className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl border-4 border-white relative z-10"
                                    >
                                        {step.icon}
                                    </motion.div>
                                </div>
                                {/* Empty space for desktop alignment */}
                                <div className="hidden md:block w-5/12"></div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* --- Terms & Notes Section --- */}
            <section className="bg-gray-100 py-16 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                    
                    {/* 1. Terms & Conditions (Accordion) */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center lg:text-left text-gray-900">Trial Terms & Conditions</h2>
                        <div className="space-y-4">
                            {terms.map((term, idx) => (
                                <motion.div
                                    key={idx}
                                    layout
                                    className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-blue-600"
                                >
                                    <button
                                        onClick={() => toggleAccordion(idx)}
                                        className="w-full flex justify-between items-center p-4 sm:p-5 text-left hover:bg-blue-50 transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="bg-blue-600 text-white p-2 rounded-full font-bold text-sm flex-shrink-0">{idx + 1}</span>
                                            <span className="font-semibold text-base sm:text-lg text-gray-800">{term.title}</span>
                                        </div>
                                        <motion.span
                                            animate={{ rotate: openIndex === idx ? 180 : 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className="text-gray-500 flex-shrink-0 ml-4"
                                        >
                                            <FaChevronDown />
                                        </motion.span>
                                    </button>

                                    {/* Accordion Content */}
                                    {openIndex === idx && (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="px-6 pb-6 pt-0 text-gray-700 text-sm md:text-base border-t border-gray-100"
                                        >
                                            {term.desc}
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Additional Notes */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center lg:text-left text-gray-900">Key Takeaways & Limitations</h2>
                        <ul className="space-y-4">
                            {additionalNotes.map((note, idx) => (
                                <motion.li 
                                    key={idx} 
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, amount: 0.5 }}
                                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                                    className="flex items-start gap-4 bg-white p-5 rounded-xl shadow hover:shadow-lg transition border-l-4 border-purple-400"
                                >
                                    <span className="mt-1 text-purple-600 text-lg flex-shrink-0">
                                        <FaCheckCircle />
                                    </span>
                                    <p className="text-base text-gray-700">{note}</p>
                                </motion.li>
                            ))}
                        </ul>
                        {/* Status Note for Registered Users */}
                        {isRegistered && (
                            <div className="mt-8 p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-xl text-center">
                                <FaUserAlt className="inline mr-2" /> You are already registered. Proceed to Dashboard or check your Purchase History.
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* --- CTA Section --- */}
            <section className="text-center py-20 bg-gradient-to-r from-blue-600 to-indigo-700 relative overflow-hidden">
                <div className="max-w-4xl mx-auto px-4">
                    {isRegistered === null ? (
                        <div className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-purple-600 font-bold text-lg animate-pulse shadow-xl">
                            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            </svg>
                            Checking status...
                        </div>
                    ) : isRegistered === false ? (
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-block"
                        >
                            <Link
                                to="/register"
                                className="px-10 py-5 bg-white text-purple-600 font-bold text-xl rounded-xl shadow-2xl transition block"
                            >
                                Start Your 7-Day Free Trial →
                            </Link>
                        </motion.div>
                    ) : (
                        <div className="relative text-white text-lg md:text-xl font-semibold p-6 bg-white/10 rounded-xl border border-white/30">
                            <p className="mb-4">
                                You are already registered. Check your status or dashboard.
                            </p>
                            <Link
                                to="/dashboard"
                                className="px-8 py-3 bg-white text-purple-600 font-semibold rounded-lg shadow transition hover:bg-gray-100"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}