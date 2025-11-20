import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence for clean exit animation
import {
    FaUsers,
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
import { Server, Users, Database, CheckCircle2, Settings, BarChart, TrendingUp, Clock, Zap } from "lucide-react"; // Using Lucide Icons for better visual match

// --- Framer Motion Variants ---
const headerVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.3, 0, 0.5, 1] } }
};

const stepItemVariants = {
    hidden: (isEven) => ({ opacity: 0, x: isEven ? -60 : 60 }),
    visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.3, 0, 0.5, 1] } }
};

const accordionVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.4, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.3 } }
};

// --- Custom Components ---
const StepIcon = ({ icon: Icon, title, isEven }) => (
    <div className="relative md:w-2/12 flex justify-center items-center my-6 md:my-0">
        {/* Mobile/Tablet Connector Line */}
        <div className="md:hidden absolute w-full h-0.5 bg-indigo-500/50 top-1/2 -translate-y-1/2"></div>
        
        <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-xl border-4 border-[#030712] relative z-10"
        >
            <Icon className="w-8 h-8"/>
        </motion.div>
    </div>
);


export default function Information() {
    const [openIndex, setOpenIndex] = useState(null);
    const [isRegistered, setIsRegistered] = useState(null);

    const toggleAccordion = (index) => setOpenIndex(openIndex === index ? null : index);

    // --- Logic Retained: Fetch User Status ---
    useEffect(() => {
        let mounted = true;
        const fetchStatus = async () => {
            try {
                // Check if user is logged in
                await api.get("/user/subscription-status");
                if (mounted) setIsRegistered(true);
            } catch (error) {
                if (mounted) setIsRegistered(false);
            }
        };
        fetchStatus();
        return () => (mounted = false);
    }, []);

    // --- Content Data (Icons updated to Lucide/consistent style) ---
    const steps = [
        { icon: Users, title: "1. Register & Trial", desc: "Sign up on the platform and confirm your email to activate your 1-month free Pro plan trial." },
        { icon: Database, title: "2. Secure Data Link", desc: "Submit your database connection details and schema to the admin for setup." },
        { icon: Settings, title: "3. Admin Configuration", desc: "The admin team securely configures the connection and creates required custom dashboard modules." },
        { icon: CheckCircle2, title: "4. System Activation", desc: "Your account is validated, and real-time data streaming begins, starting your trial countdown." },
        { icon: BarChart, title: "5. Dashboard Access", desc: "View your personal dashboard with live data, rich charts, and configured modules." },
        { icon: TrendingUp, title: "6. Subscription Ready", desc: "Enjoy your free trial. After 1 month, subscribe to a paid plan to regain full access." },
    ];

    const terms = [
        { title: "Eligibility", desc: "The 1-month free trial is available exclusively for new user registrations only." },
        { title: "Trial Period Start", desc: "The trial only begins once the admin activates your account after receiving database credentials." },
        { title: "Required Setup", desc: "Trial cannot be initiated until you provide valid database details and specify initial dashboard requirements." },
        { title: "User Limitations", desc: "During the trial, users have view-only access and cannot personally modify data connections or module settings." },
        { title: "Conversion to Paid Plan", desc: "Access is automatically revoked upon trial expiration. A subscription is required to restore service." },
        { title: "Admin Rights", desc: "Admin reserves the right to suspend or block accounts immediately in case of misuse or security violations." },
        { title: "Data Security Responsibility", desc: "You are responsible for the correctness and security of the database credentials provided. NGraph only uses them for data retrieval." },
    ];

    const additionalNotes = [
        "All module creation, database connection, and system configurations are strictly managed by the admin.",
        "Users maintain view-only privileges, ensuring system stability and data integrity.",
        "For technical issues, feature requests, or module modifications, direct communication with the admin team is required.",
    ];

    return (
        <div className="min-h-screen bg-[#030712] text-white font-sans">

            {/* --- Hero Section --- */}
            <motion.header
                className="relative bg-gradient-to-br from-gray-900 to-indigo-900 py-24 px-4 sm:px-6 text-center overflow-hidden border-b border-indigo-700/50"
                initial="hidden"
                animate="visible"
                variants={headerVariants}
            >
                {/* Background Blobs (Pure CSS) */}
                <div className="absolute inset-0 -z-10 opacity-30">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px]"></div>
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 relative z-10 tracking-tighter">
                    Platform Onboarding & Trial Terms
                </h1>
                <p className="text-lg md:text-xl text-slate-300 relative z-10 max-w-4xl mx-auto font-light">
                    A simple 6-step process to get your live dashboard, plus critical details on your 1-month free trial.
                </p>
            </motion.header>

            {/* --- 6-Step Timeline Section --- */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-16 text-center text-white tracking-tight">
                    <Zap className="inline w-8 h-8 text-teal-400 mr-2" /> 
                    6-Step Fast-Track Activation
                </h2>
                
                <div className="relative">
                    {/* Vertical Timeline Line (Desktop Only) */}
                    <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 w-1 h-full bg-gradient-to-b from-teal-500 to-purple-600 rounded-full shadow-lg" />
                    
                    {steps.map((step, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                            <div
                                key={idx}
                                className={`flex flex-col md:flex-row items-center mb-16 ${!isEven ? "md:flex-row-reverse" : ""}`} 
                            >
                                {/* Content Card */}
                                <motion.div
                                    custom={isEven}
                                    initial="hidden"
                                    whileInView="visible"
                                    variants={stepItemVariants}
                                    viewport={{ once: true, amount: 0.5 }}
                                    className="bg-gray-800/80 backdrop-blur-md rounded-xl shadow-2xl p-6 w-full md:w-5/12 border border-indigo-700/50 transform hover:scale-[1.02] transition duration-300" 
                                >
                                    <h3 className="font-extrabold text-xl text-teal-400 tracking-tight">{step.title}</h3>
                                    <p className="text-slate-300 text-base mt-2">{step.desc}</p>
                                </motion.div>

                                {/* Center Circle/Icon */}
                                <StepIcon icon={step.icon} title={step.title} isEven={isEven} />
                                
                                {/* Empty space for desktop alignment */}
                                <div className="hidden md:block w-5/12"></div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* --- Terms & Notes Section --- */}
            <section className="bg-gray-900 py-16 px-4 sm:px-6 border-t border-gray-800/50">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                    
                    {/* 1. Terms & Conditions (Accordion) */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-10 text-center lg:text-left text-white tracking-tight">Trial Terms & Conditions</h2>
                        <div className="space-y-4">
                            <AnimatePresence initial={false}>
                                {terms.map((term, idx) => (
                                    <motion.div
                                        key={idx}
                                        layout
                                        className="bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border-l-4 border-purple-600 border-opacity-70"
                                    >
                                        <button
                                            onClick={() => toggleAccordion(idx)}
                                            className="w-full flex justify-between items-center p-4 sm:p-5 text-left hover:bg-gray-700/70 transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="bg-purple-600 text-white p-2 rounded-full font-bold text-sm flex-shrink-0 shadow-md">{idx + 1}</span>
                                                <span className="font-semibold text-base sm:text-lg text-white">{term.title}</span>
                                            </div>
                                            <motion.span
                                                animate={{ rotate: openIndex === idx ? 180 : 0 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                className="text-purple-400 flex-shrink-0 ml-4"
                                            >
                                                <FaChevronDown />
                                            </motion.span>
                                        </button>

                                        {/* Accordion Content */}
                                        {openIndex === idx && (
                                            <motion.div
                                                variants={accordionVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                className="px-6 pb-6 pt-0 text-slate-300 text-sm md:text-base border-t border-gray-700"
                                            >
                                                {term.desc}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* 2. Additional Notes */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-10 text-center lg:text-left text-white tracking-tight">Key Takeaways & Limitations</h2>
                        <ul className="space-y-4">
                            {additionalNotes.map((note, idx) => (
                                <motion.li 
                                    key={idx} 
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, amount: 0.5 }}
                                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                                    className="flex items-start gap-4 bg-gray-800/70 p-5 rounded-xl shadow border-l-4 border-teal-500/70 hover:shadow-lg hover:bg-gray-800 transition"
                                >
                                    <span className="mt-1 text-teal-400 text-lg flex-shrink-0">
                                        <CheckCircle2 />
                                    </span>
                                    <p className="text-base text-slate-300">{note}</p>
                                </motion.li>
                            ))}
                        </ul>
                        {/* Status Note for Registered Users */}
                        {isRegistered && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 100 }}
                                className="mt-8 p-4 bg-indigo-900/50 border border-indigo-700 text-indigo-300 rounded-xl text-center shadow-lg"
                            >
                                <FaUserAlt className="inline mr-2 text-indigo-400" /> You are currently registered/logged in. Proceed to Dashboard or check your status.
                            </motion.div>
                        )}
                    </div>
                </div>
            </section>

            {/* --- CTA Section --- */}
            <section className="text-center py-20 bg-gradient-to-r from-indigo-900 to-purple-900 relative overflow-hidden">
                <div className="max-w-4xl mx-auto px-4">
                    {isRegistered === null ? (
                        <div className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-purple-600 font-bold text-lg animate-pulse shadow-xl">
                            <Clock className="w-6 h-6 animate-spin" />
                            Checking registration status...
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
                                className="px-10 py-5 bg-teal-400 text-gray-900 font-extrabold text-xl rounded-xl shadow-2xl transition block shadow-teal-400/50"
                            >
                                Start Your 1-Month Free Trial Now →
                            </Link>
                        </motion.div>
                    ) : (
                        <div className="relative text-white text-lg md:text-xl font-semibold p-6 bg-white/10 rounded-xl border border-white/30">
                            <p className="mb-4 text-white">
                                You are already registered. Ready to check your live dashboard?
                            </p>
                            <Link
                                to="/dashboard"
                                className="px-8 py-3 bg-teal-400 text-gray-900 font-semibold rounded-lg shadow transition hover:bg-teal-300"
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