// src/pages/Register.js
import React, { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import {
    Building2,
    User,
    Phone,
    Mail,
    Lock,
    Eye,
    EyeOff,
    UserPlus,
    TrendingUp,
    DollarSign,
    Users,
    Briefcase,
} from "lucide-react";
import { motion } from "framer-motion";

/* ---------- Motion Variants ---------- */
const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        transition: { delay, duration: 0.55, ease: "easeOut" },
    }),
};

/* ---------- Left-column Feature Card ---------- */
const FeatureCard = memo(({ Icon, title, description, gradient }) => (
    <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        className="flex items-start gap-4 p-4 rounded-2xl bg-white/3 border border-white/10 backdrop-blur-lg shadow-[0_8px_30px_rgba(8,10,25,0.6)]"
    >
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
            <h4 className="text-white font-semibold">{title}</h4>
            <p className="text-slate-300 text-sm mt-1">{description}</p>
        </div>
    </motion.div>
));

/* ---------- Memoized Left Column ---------- */
const MemoizedLeftColumn = memo(() => (
    <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 -z-10">
            <div className="absolute -left-32 -top-36 w-[48rem] h-[48rem] rounded-full bg-indigo-700/25 blur-[140px] animate-[float_9s_linear_infinite]" />
            <div className="absolute -right-40 -bottom-40 w-[56rem] h-[56rem] rounded-full bg-teal-500/20 blur-[150px] animate-[float_11s_linear_infinite]" />
        </div>

        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative w-full max-w-lg p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_40px_120px_rgba(16,18,40,0.7)]"
        >
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                Start Your NGraph Journey.
            </h1>
            <p className="text-slate-300 text-sm mb-8">
                Register in minutes and unlock powerful SQL-driven dashboards, real-time analytics, and automated reporting.
            </p>

            <div className="grid gap-4">
                <FeatureCard
                    Icon={TrendingUp}
                    title="Instant Activation"
                    description="Begin your trial and start visualizing data immediately."
                    gradient="from-indigo-600 to-violet-500"
                />
                <FeatureCard
                    Icon={DollarSign}
                    title="Free Trial Access"
                    description="Explore premium analytics with zero commitment."
                    gradient="from-amber-500 to-yellow-400"
                />
                <FeatureCard
                    Icon={Users}
                    title="Guided Onboarding"
                    description="Our team supports your setup from day one."
                    gradient="from-fuchsia-500 to-pink-500"
                />
            </div>
        </motion.div>
    </div>
));

export default function Register() {
    /* ---------- States ---------- */
    const [formData, setFormData] = useState({
        CompanyName: "",
        CustomerName: "",
        PhoneNumber: "",
        Email: "",
        GST: "",
        Password: "",
        ConfirmPassword: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [resendMessage, setResendMessage] = useState("");
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [isUnconfirmed, setIsUnConfirmed] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    /* ---------- Cooldown timer ---------- */
    useEffect(() => {
        if (cooldown > 0) {
            const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [cooldown]);

    /* ---------- Handlers ---------- */
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });

        if (registrationComplete || isUnconfirmed) {
            setRegistrationComplete(false);
            setIsUnConfirmed(false);
            setResendMessage("");
            setCooldown(0);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setResendMessage("");

        if (formData.Password !== formData.ConfirmPassword) {
            setMessage("❌ Passwords do not match.");
            return;
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(formData.PhoneNumber)) {
            setMessage("❌ Invalid phone number format.");
            return;
        }

        try {
            const response = await api.post("/account/register", formData);

            if (response.data.message?.includes("didn’t confirm your email")) {
                setIsUnConfirmed(true);
                setCooldown(120);
                setMessage("⚠️ Email previously registered but unconfirmed. A new link has been sent.");
            } else {
                setRegistrationComplete(true);
                setCooldown(120);
                setMessage("✅ Registration successful! Please confirm your email.");
            }
        } catch (err) {
            const data = err.response?.data;
            const errors = [];

            if (data?.message) {
                errors.push("❌ " + data.message);
            } else if (Array.isArray(data?.errors)) {
                data.errors.forEach((x) => errors.push("❌ " + (x.description || "A field error occurred.")));
            } else if (typeof data?.errors === "object") {
                Object.values(data.errors).flat().forEach((msg) => errors.push("❌ " + msg));
            } else {
                errors.push("❌ Unknown error. Check your inputs.");
            }

            setMessage(errors.join(" "));
        }
    };

    const handleResendConfirmation = async () => {
        try {
            await api.post("/account/resend-confirmation", { email: formData.Email });
            setResendMessage("✅ A new confirmation email has been sent.");
            setCooldown(120);
        } catch {
            setResendMessage("❌ Failed to resend confirmation email.");
        }
    };

    const showForm = !registrationComplete && !isUnconfirmed;

    return (
        <div className="min-h-screen bg-[#0b0d10] text-white flex items-stretch">
            {/* Left section */}
            <MemoizedLeftColumn />

            {/* Right section */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:w-1/2">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-xl p-6 sm:p-10 rounded-3xl bg-white/4 backdrop-blur-xl border border-white/10 shadow-[0_30px_100px_rgba(4,6,20,0.75)]"
                >
                    {/* Top Accent */}
                    <div className="w-20 h-1 bg-gradient-to-r from-indigo-500 to-teal-400 mb-6 rounded-full" />

                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-xl mx-auto bg-gradient-to-br from-indigo-600 to-teal-400 flex items-center justify-center shadow-lg">
                            <UserPlus className="w-7 h-7 text-white" />
                        </div>

                        <h2 className="mt-4 text-3xl font-extrabold">Create Your Account</h2>
                        <p className="text-slate-300 mt-1">Register your details to begin your analytics journey.</p>
                    </div>

                    {/* Messages */}
                    {message && (
                        <div
                            className={`p-3 mb-4 rounded-xl text-sm border ${message.includes("✅") || message.includes("⚠️")
                                    ? "bg-green-900/30 border-green-700 text-green-200"
                                    : "bg-red-900/30 border-red-700 text-red-200"
                                }`}
                        >
                            {message}
                        </div>
                    )}

                    {/* Confirmation state */}
                    {(registrationComplete || isUnconfirmed) && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 rounded-xl bg-white/5 border border-white/10 shadow-lg text-center space-y-4"
                        >
                            <h3 className="text-xl font-semibold text-indigo-300">Action Required</h3>

                            <p className="text-slate-300">
                                Please check your email <span className="font-semibold text-white">({formData.Email})</span> to verify your
                                account. After confirmation, an admin will activate your access.
                            </p>

                            {cooldown > 0 ? (
                                <p className="text-sm text-slate-300">
                                    You can resend in <span className="text-red-400 font-bold">{cooldown}</span> seconds.
                                </p>
                            ) : (
                                <button
                                    onClick={handleResendConfirmation}
                                    className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-teal-400 text-black font-semibold rounded-xl shadow hover:opacity-90 transition"
                                >
                                    Resend Confirmation Email
                                </button>
                            )}

                            {resendMessage && (
                                <p
                                    className={`text-sm ${resendMessage.includes("✅") ? "text-green-300" : "text-red-300"
                                        }`}
                                >
                                    {resendMessage}
                                </p>
                            )}

                            <Link to="/login" className="text-sm text-teal-300 hover:text-teal-200 font-medium block pt-2">
                                Back to Login
                            </Link>
                        </motion.div>
                    )}

                    {/* Registration Form */}
                    {showForm && (
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            {/* First Row */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-3 text-black" size={18} />
                                    <input
                                        name="CompanyName"
                                        required
                                        value={formData.CompanyName}
                                        onChange={handleChange}
                                        placeholder="Company Name"
                                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/6 border border-white/10 text-black placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-600/20 outline-none"
                                    />
                                </div>

                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-black" size={18} />
                                    <input
                                        name="CustomerName"
                                        required
                                        value={formData.CustomerName}
                                        onChange={handleChange}
                                        placeholder="Full Name"
                                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/6 border border-white/10 text-black placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-600/20 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Second Row */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-black" size={18} />
                                    <input
                                        name="PhoneNumber"
                                        required
                                        value={formData.PhoneNumber}
                                        onChange={handleChange}
                                        placeholder="Phone Number"
                                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/6 border border-white/10 text-black placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-600/20 outline-none"
                                    />
                                </div>

                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-3 text-black" size={18} />
                                    <input
                                        name="GST"
                                        value={formData.GST}
                                        onChange={handleChange}
                                        placeholder="GST (optional)"
                                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/6 border border-white/10 text-black placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-600/20 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-black" size={18} />
                                <input
                                    name="Email"
                                    type="email"
                                    required
                                    value={formData.Email}
                                    onChange={handleChange}
                                    placeholder="Email Address"
                                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/6 border border-white/10 text-black placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-600/20 outline-none"
                                />
                            </div>

                            {/* Password Row */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                {/* Password */}
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-black" size={18} />
                                    <input
                                        name="Password"
                                        required
                                        type={showPassword ? "text" : "password"}
                                        value={formData.Password}
                                        onChange={handleChange}
                                        placeholder="Password"
                                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/6 border border-white/10 text-black placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-600/20 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((p) => !p)}
                                        className="absolute right-3 top-3 text-black hover:text-teal-900"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {/* Confirm Password */}
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-black" size={18} />
                                    <input
                                        name="ConfirmPassword"
                                        required
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={formData.ConfirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm Password"
                                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/6 border border-white/10 text-black placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-600/20 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((p) => !p)}
                                        className="absolute right-3 top-3 text-black hover:text-teal-900"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-400 shadow-lg text-black font-semibold transition"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <UserPlus className="w-5 h-5" />
                                    Register Account
                                </div>
                            </motion.button>
                        </form>
                    )}

                    {/* Bottom link */}
                    <p className="mt-8 text-center text-sm text-slate-300">
                        Already have an account?{" "}
                        <Link to="/login" className="text-teal-300 hover:text-teal-200 font-medium">
                            Login here
                        </Link>
                    </p>

                    {/* small footnote */}
                    {/* <p className="mt-4 text-xs text-slate-500 text-center">
                        By registering, you agree to our <Link to="/terms-of-service" className="underline">Terms</Link> and <Link to="/privacy-policy" className="underline">Privacy Policy</Link>.
                    </p> */}
                </motion.div>
            </div>

            {/* Float animation */}
            <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .animate-[float_9s_linear_infinite] { animation: float 9s linear infinite; }
        .animate-[float_11s_linear_infinite] { animation: float 11s linear infinite; }
      `}</style>
        </div>
    );
}
